<?php
declare(strict_types=1);

/**
 * Persistence for `google_calendar_connections` (Sprint 010 Phase 2).
 *
 * Token columns are written/read as separate ciphertext/nonce/tag fields via
 * `TokenCipher` — this repository never decrypts. It also records whether the
 * connection is referenced by any `google_event_sync` row, which decides whether
 * a disconnect may hard-delete or must preserve audit identity.
 */
final class GoogleConnectionRepository
{
    public function __construct(private readonly PDO $db) {}

    /**
     * @return array<string,mixed>|null
     */
    public function findForUser(int $userId, int $tenantId = 1): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM google_calendar_connections WHERE user_id = :user AND tenant_id = :tenant LIMIT 1'
        );
        $stmt->execute(['user' => $userId, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Create or replace the connection for a user. Used only after OAuth success.
     *
     * On reconnect:
     *   * Access token: always replaced.
     *   * Refresh token: replaced ONLY when a new one was returned. When the new
     *     value is null, the caller passes the EXISTING stored refresh fields so a
     *     valid refresh token is never overwritten with null.
     *
     * @param array<string,mixed> $data
     */
    public function upsertConnected(int $userId, int $tenantId, array $data): int
    {
        $existing = $this->findForUser($userId, $tenantId);

        $params = [
            'user' => $userId,
            'tenant' => $tenantId,
            'email' => $data['google_account_email'] ?? null,
            'calendar' => $data['google_calendar_id'] ?? 'primary',
            'at_cipher' => $data['access_token_cipher'] ?? null,
            'at_nonce' => $data['access_token_nonce'] ?? null,
            'at_tag' => $data['access_token_tag'] ?? null,
            'rt_cipher' => $data['refresh_token_cipher'] ?? null,
            'rt_nonce' => $data['refresh_token_nonce'] ?? null,
            'rt_tag' => $data['refresh_token_tag'] ?? null,
            'key_version' => $data['key_version'] ?? 1,
            'expires' => $data['token_expires_at'] ?? null,
            'scope' => $data['scope'] ?? null,
        ];

        if ($existing === null) {
            $stmt = $this->db->prepare(
                'INSERT INTO google_calendar_connections
                    (tenant_id, user_id, google_account_email, google_calendar_id,
                     access_token_cipher, access_token_nonce, access_token_tag,
                     refresh_token_cipher, refresh_token_nonce, refresh_token_tag,
                     key_version, token_expires_at, scope, status, pending_account_email,
                     last_error, connected_at)
                 VALUES
                    (:tenant, :user, :email, :calendar,
                     :at_cipher, :at_nonce, :at_tag,
                     :rt_cipher, :rt_nonce, :rt_tag,
                     :key_version, :expires, :scope, \'connected\', NULL,
                     NULL, UTC_TIMESTAMP())'
            );
            $stmt->execute($params);
            return (int) $this->db->lastInsertId();
        }

        $stmt = $this->db->prepare(
            'UPDATE google_calendar_connections
                SET google_account_email = :email,
                    google_calendar_id = :calendar,
                    access_token_cipher = :at_cipher,
                    access_token_nonce = :at_nonce,
                    access_token_tag = :at_tag,
                    refresh_token_cipher = :rt_cipher,
                    refresh_token_nonce = :rt_nonce,
                    refresh_token_tag = :rt_tag,
                    key_version = :key_version,
                    token_expires_at = :expires,
                    scope = :scope,
                    status = \'connected\',
                    pending_account_email = NULL,
                    last_error = NULL,
                    revoked_at = NULL,
                    version = version + 1
              WHERE id = :id'
        );
        // The UPDATE has no tenant/user placeholders; pass only what it binds.
        $updateParams = $params;
        unset($updateParams['user'], $updateParams['tenant']);
        $updateParams['id'] = (int) $existing['id'];
        $stmt->execute($updateParams);

        return (int) $existing['id'];
    }

    /**
     * Update only the access token (transparent refresh). Leaves the refresh
     * token untouched.
     *
     * @param array<string,mixed> $data
     */
    public function updateAccessToken(int $connectionId, array $data): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_connections
                SET access_token_cipher = :cipher,
                    access_token_nonce = :nonce,
                    access_token_tag = :tag,
                    key_version = :key_version,
                    token_expires_at = :expires,
                    last_refreshed_at = UTC_TIMESTAMP(),
                    version = version + 1
              WHERE id = :id'
        );
        $stmt->execute([
            'cipher' => $data['access_token_cipher'] ?? null,
            'nonce' => $data['access_token_nonce'] ?? null,
            'tag' => $data['access_token_tag'] ?? null,
            'key_version' => $data['key_version'] ?? 1,
            'expires' => $data['token_expires_at'] ?? null,
            'id' => $connectionId,
        ]);
    }

    public function markNeedsReconnect(int $connectionId, string $safeReason = ''): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_connections
                SET status = \'needs_reconnect\',
                    last_error = :reason,
                    version = version + 1
              WHERE id = :id'
        );
        $stmt->execute(['reason' => mb_substr($safeReason, 0, 255), 'id' => $connectionId]);
    }

    public function markAccountMismatch(int $connectionId, string $pendingEmail): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_connections
                SET status = \'account_mismatch\',
                    pending_account_email = :pending,
                    version = version + 1
              WHERE id = :id'
        );
        $stmt->execute(['pending' => mb_substr($pendingEmail, 0, 255), 'id' => $connectionId]);
    }

    /**
     * Disconnect. Clears the encrypted token fields unconditionally, then:
     *   * hard-deletes the row when nothing references it, or
     *   * preserves it with status `disconnected` when `google_event_sync` rows
     *     reference it, so the audit identity survives.
     *
     * @return bool true when the row was hard-deleted, false when preserved.
     */
    public function disconnect(int $connectionId): bool
    {
        $this->clearTokens($connectionId);

        if ($this->isReferenced($connectionId)) {
            $stmt = $this->db->prepare(
                'UPDATE google_calendar_connections
                    SET status = \'disconnected\',
                        pending_account_email = NULL,
                        last_error = NULL,
                        revoked_at = UTC_TIMESTAMP(),
                        version = version + 1
                  WHERE id = :id'
            );
            $stmt->execute(['id' => $connectionId]);
            return false;
        }

        $stmt = $this->db->prepare('DELETE FROM google_calendar_connections WHERE id = :id');
        $stmt->execute(['id' => $connectionId]);
        return true;
    }

    /** Clear all encrypted token material (used by disconnect). */
    public function clearTokens(int $connectionId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_calendar_connections
                SET access_token_cipher = NULL, access_token_nonce = NULL, access_token_tag = NULL,
                    refresh_token_cipher = NULL, refresh_token_nonce = NULL, refresh_token_tag = NULL,
                    token_expires_at = NULL,
                    version = version + 1
              WHERE id = :id'
        );
        $stmt->execute(['id' => $connectionId]);
    }

    /** True when any google_event_sync row references this connection. */
    public function isReferenced(int $connectionId): bool
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM google_event_sync WHERE connection_id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $connectionId]);
        return (bool) $stmt->fetchColumn();
    }
}
