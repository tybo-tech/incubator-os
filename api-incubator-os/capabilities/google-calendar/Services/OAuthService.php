<?php
declare(strict_types=1);

/**
 * The OAuth lifecycle (Sprint 010 Phase 2).
 *
 * Responsibilities:
 *   * Build the authorization URL (offline access, consent prompt, fixed
 *     configured redirect URI, least-privilege scopes, opaque random state).
 *   * Handle the callback: validate the session + state, exchange the code, read
 *     the authoritative Google email, require the Calendar scope, encrypt and
 *     store tokens.
 *   * Disconnect: best-effort revoke, then always clear local encrypted tokens.
 *
 * Boundaries enforced here:
 *   * The redirect URI is taken ONLY from configuration; a client-supplied value
 *     is never used.
 *   * Authorization codes, tokens and provider errors never leave this class as
 *     plaintext in a message or log; they pass through `SecretRedactor`.
 *   * Reconnecting without a new refresh token preserves the existing valid one.
 *   * A revoked refresh token (`invalid_grant`) moves the connection to
 *     `needs_reconnect`.
 *   * A reconnect with a DIFFERENT Google account while published mappings exist
 *     is NOT silently applied: the connection is marked `account_mismatch`.
 */
final class OAuthService
{
    private const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const STATE_TTL_SECONDS = 600; // 10 minutes

    public function __construct(
        private readonly GoogleApiClient $client,
        private readonly GoogleConnectionRepository $connections,
        private readonly GoogleEventSyncRepository $sync,
        private readonly GoogleOAuthStateRepository $states,
        private readonly TokenCipher $cipher,
        private readonly string $redirectUri,
        private readonly string $calendarId = 'primary',
    ) {}

    public static function fromConfig(PDO $db): self
    {
        return new self(
            client: GoogleApiClientFactory::create(),
            connections: new GoogleConnectionRepository($db),
            sync: new GoogleEventSyncRepository($db),
            states: new GoogleOAuthStateRepository($db),
            cipher: TokenCipher::fromConfig(),
            redirectUri: google_redirect_uri(),
            calendarId: (string) (google_config()['default_calendar_id'] ?? 'primary'),
        );
    }

    /**
     * Build the authorization URL and persist the opaque single-use state.
     *
     * @return array{authUrl:string,state:string}
     */
    public function authorizationUrl(int $tenantId, int $userId, ?string $returnPath): array
    {
        $state = bin2hex(random_bytes(32)); // 256-bit opaque
        $stateHash = hash('sha256', $state);
        $safeReturnPath = ReturnPathValidator::sanitize($returnPath);

        $this->states->create($tenantId, $userId, $stateHash, $safeReturnPath, self::STATE_TTL_SECONDS);
        $this->states->deleteStale();

        $params = [
            'client_id' => (string) (google_config()['client_id'] ?? ''),
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => GoogleScopes::asParameter(),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ];

        return [
            'authUrl' => self::AUTH_ENDPOINT . '?' . http_build_query($params),
            'state' => $state,
        ];
    }

    /**
     * Handle the callback.
     *
     * @param array<string,string> $query the callback's query string
     * @return array{result:string, returnPath:string, connectionId:?int}
     *         `result` is a safe `GoogleOAuthResult` code.
     */
    public function handleCallback(array $query, int $tenantId, int $userId): array
    {
        // The state determines where the browser goes back to. Resolve a safe
        // default first so every early return has a path.
        $returnPath = ReturnPathValidator::DEFAULT;

        // Denial is a normal, safe outcome: no connection is written.
        if (isset($query['error'])) {
            // Google returns `error=access_denied` when the user declines.
            $error = (string) $query['error'];
            $this->safeLog('OAuth callback returned an error.', ['error' => $error]);
            if ($error === 'access_denied') {
                return ['result' => GoogleOAuthResult::DENIED, 'returnPath' => $returnPath, 'connectionId' => null];
            }
            return ['result' => GoogleOAuthResult::FAILED, 'returnPath' => $returnPath, 'connectionId' => null];
        }

        $state = isset($query['state']) ? (string) $query['state'] : '';
        $code = isset($query['code']) ? (string) $query['code'] : '';

        if ($state === '' || $code === '') {
            return ['result' => GoogleOAuthResult::INVALID, 'returnPath' => $returnPath, 'connectionId' => null];
        }

        // Single-use, session-bound, tenant-bound state. This is checked BEFORE
        // the code is exchanged.
        $stateRow = $this->states->consume(hash('sha256', $state), $tenantId, $userId);
        if ($stateRow === null) {
            $this->safeLog('OAuth state rejected (missing/expired/reused/cross-user).', []);
            return ['result' => GoogleOAuthResult::INVALID, 'returnPath' => $returnPath, 'connectionId' => null];
        }

        $returnPath = ReturnPathValidator::sanitize((string) ($stateRow['return_path'] ?? null));

        // Exchange the code, then resolve the authoritative Google email.
        try {
            $tokenSet = $this->client->exchangeCode($code, $this->redirectUri);
            $email = $this->client->userInfoEmail($tokenSet->accessToken);
        } catch (GoogleApiException $e) {
            $this->safeLog('OAuth code exchange or identity lookup failed.', ['reason' => $e->reason()]);
            return ['result' => GoogleOAuthResult::FAILED, 'returnPath' => $returnPath, 'connectionId' => null];
        }

        // The required Calendar scope must actually have been granted.
        if (!$this->hasCalendarScope($tokenSet->scope)) {
            $this->safeLog('Required Calendar scope was not granted.', []);
            return ['result' => GoogleOAuthResult::SCOPE_MISSING, 'returnPath' => $returnPath, 'connectionId' => null];
        }

        $existing = $this->connections->findForUser($userId, $tenantId);

        // Account-mismatch guard: do not silently reassign mappings to a new account.
        if ($existing !== null) {
            $existingEmail = (string) ($existing['google_account_email'] ?? '');
            $published = $this->sync->countPublishedForConnection((int) $existing['id']);
            if ($existingEmail !== '' && strcasecmp($existingEmail, $email) !== 0 && $published > 0) {
                $this->connections->markAccountMismatch((int) $existing['id'], $email);
                // Do NOT store the new tokens over the old account's connection.
                $this->safeLog('Reconnect used a different Google account with published mappings.', []);
                return [
                    'result' => GoogleOAuthResult::ACCOUNT_MISMATCH,
                    'returnPath' => $returnPath,
                    'connectionId' => (int) $existing['id'],
                ];
            }
        }

        // Preserve an existing valid refresh token when the new grant yields none.
        $refreshToken = $tokenSet->refreshToken;
        if (($refreshToken === null || $refreshToken === '') && $existing !== null) {
            $refreshToken = $this->readExistingRefreshToken($existing, $tenantId, $userId);
        }

        $connectionId = $this->persist(
            $userId,
            $tenantId,
            $email,
            $tokenSet,
            $refreshToken,
        );

        return ['result' => GoogleOAuthResult::CONNECTED, 'returnPath' => $returnPath, 'connectionId' => $connectionId];
    }

    /**
     * Disconnect: best-effort revoke, then ALWAYS clear local encrypted tokens.
     *
     * @return bool true when the row was hard-deleted, false when preserved
     *              (because mappings reference it).
     */
    public function disconnect(int $tenantId, int $userId): bool
    {
        $existing = $this->connections->findForUser($userId, $tenantId);
        if ($existing === null) {
            return true; // already disconnected is a clean no-op
        }

        // Best-effort remote revoke using the access token (or refresh token).
        $token = $this->readExistingAccessToken($existing, $tenantId, $userId)
            ?? $this->readExistingRefreshToken($existing, $tenantId, $userId);
        if ($token !== null && $token !== '') {
            $this->client->revoke($token);
        }

        // Clear encrypted tokens regardless of whether the remote revoke worked.
        return $this->connections->disconnect((int) $existing['id']);
    }

    /**
     * Refresh the access token transparently before a Google call.
     *
     * @return string the fresh access token
     * @throws GoogleApiException when the refresh fails
     */
    public function freshAccessToken(int $tenantId, int $userId, bool $force = false): string
    {
        $existing = $this->connections->findForUser($userId, $tenantId);
        if ($existing === null) {
            throw new GoogleForbiddenException('No Google connection exists for this user.');
        }

        $expiresAt = $existing['token_expires_at'] ?? null;
        $expired = true;
        if (is_string($expiresAt) && $expiresAt !== '') {
            $expiry = new DateTimeImmutable($expiresAt, new DateTimeZone('UTC'));
            $expired = $expiry <= (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('+60 seconds');
        }

        if (!$expired && !$force) {
            $current = $this->readExistingAccessToken($existing, $tenantId, $userId);
            if ($current !== null && $current !== '') {
                return $current;
            }
        }

        $refreshToken = $this->readExistingRefreshToken($existing, $tenantId, $userId);
        if ($refreshToken === null || $refreshToken === '') {
            $this->connections->markNeedsReconnect((int) $existing['id'], 'No refresh token available.');
            throw new GoogleApiException('Google authorisation is no longer valid.', GoogleApiException::REASON_INVALID_GRANT, 0);
        }

        try {
            $tokenSet = $this->client->refreshToken($refreshToken);
        } catch (GoogleApiException $e) {
            if ($e->requiresReconnect() || $e->reason() === GoogleApiException::REASON_INVALID_GRANT) {
                // invalid_grant -> needs_reconnect.
                $this->connections->markNeedsReconnect((int) $existing['id'], 'Google refresh token was rejected.');
            }
            throw $e;
        }

        $aad = TokenCipher::aad($tenantId, $userId, 'google', 'access_token');
        $encrypted = $this->cipher->encrypt($tokenSet->accessToken, $aad);
        $this->connections->updateAccessToken((int) $existing['id'], [
            'access_token_cipher' => $encrypted->ciphertext,
            'access_token_nonce' => $encrypted->nonce,
            'access_token_tag' => $encrypted->tag,
            'key_version' => $encrypted->keyVersion(),
            'token_expires_at' => $this->expiryFrom($tokenSet->expiresIn),
        ]);

        return $tokenSet->accessToken;
    }

    private function persist(int $userId, int $tenantId, string $email, GoogleTokenSet $tokenSet, ?string $refreshToken): int
    {
        $accessAad = TokenCipher::aad($tenantId, $userId, 'google', 'access_token');
        $encryptedAccess = $this->cipher->encrypt($tokenSet->accessToken, $accessAad);

        $data = [
            'google_account_email' => $email,
            'google_calendar_id' => $this->calendarId,
            'access_token_cipher' => $encryptedAccess->ciphertext,
            'access_token_nonce' => $encryptedAccess->nonce,
            'access_token_tag' => $encryptedAccess->tag,
            'key_version' => $encryptedAccess->keyVersion(),
            'token_expires_at' => $this->expiryFrom($tokenSet->expiresIn),
            'scope' => $tokenSet->scope,
        ];

        if ($refreshToken !== null && $refreshToken !== '') {
            $refreshAad = TokenCipher::aad($tenantId, $userId, 'google', 'refresh_token');
            $encryptedRefresh = $this->cipher->encrypt($refreshToken, $refreshAad);
            $data['refresh_token_cipher'] = $encryptedRefresh->ciphertext;
            $data['refresh_token_nonce'] = $encryptedRefresh->nonce;
            $data['refresh_token_tag'] = $encryptedRefresh->tag;
        } else {
            // No refresh token at all (first connection). Store nulls explicitly.
            $data['refresh_token_cipher'] = null;
            $data['refresh_token_nonce'] = null;
            $data['refresh_token_tag'] = null;
        }

        return $this->connections->upsertConnected($userId, $tenantId, $data);
    }

    private function readExistingRefreshToken(array $row, int $tenantId, int $userId): ?string
    {
        $payload = EncryptedPayload::fromArray([
            'ciphertext' => $row['refresh_token_cipher'] ?? '',
            'nonce' => $row['refresh_token_nonce'] ?? '',
            'tag' => $row['refresh_token_tag'] ?? '',
            'key_version' => $row['key_version'] ?? 1,
        ]);
        if (!$payload->isComplete()) {
            return null;
        }
        try {
            return $this->cipher->decrypt($payload, TokenCipher::aad($tenantId, $userId, 'google', 'refresh_token'));
        } catch (GoogleDecryptionException) {
            return null;
        }
    }

    private function readExistingAccessToken(array $row, int $tenantId, int $userId): ?string
    {
        $payload = EncryptedPayload::fromArray([
            'ciphertext' => $row['access_token_cipher'] ?? '',
            'nonce' => $row['access_token_nonce'] ?? '',
            'tag' => $row['access_token_tag'] ?? '',
            'key_version' => $row['key_version'] ?? 1,
        ]);
        if (!$payload->isComplete()) {
            return null;
        }
        try {
            return $this->cipher->decrypt($payload, TokenCipher::aad($tenantId, $userId, 'google', 'access_token'));
        } catch (GoogleDecryptionException) {
            return null;
        }
    }

    private function hasCalendarScope(string $granted): bool
    {
        if ($granted === '') {
            return false;
        }
        $scopes = preg_split('/\s+/', trim($granted)) ?: [];
        return in_array(GoogleScopes::CALENDAR_EVENTS, $scopes, true);
    }

    private function expiryFrom(int $expiresIn): string
    {
        $seconds = $expiresIn > 0 ? $expiresIn : 3600;
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))
            ->modify('+' . $seconds . ' seconds')
            ->format('Y-m-d H:i:s');
    }

    /**
     * Log through the redacting seam only. Provider error text is redacted.
     *
     * @param array<string,mixed> $context
     */
    private function safeLog(string $message, array $context): void
    {
        if (class_exists('GoogleLog')) {
            GoogleLog::warning(SecretRedactor::redact($message), SecretRedactor::redactContext($context));
        }
    }
}
