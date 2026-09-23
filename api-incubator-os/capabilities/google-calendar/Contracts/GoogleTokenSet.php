<?php
declare(strict_types=1);

/**
 * Normalised Google OAuth token response (Sprint 010 Phase 1).
 *
 * A transport-agnostic value object so neither the cURL client nor the fake
 * leaks raw JSON to callers. Never logged; `jsonSerialize()` excludes secrets.
 */
final class GoogleTokenSet implements JsonSerializable
{
    public function __construct(
        public readonly string $accessToken,
        public readonly ?string $refreshToken,
        public readonly int $expiresIn,
        public readonly string $scope = '',
        public readonly string $tokenType = 'Bearer',
    ) {}

    /** @param array<string,mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            accessToken: (string) ($data['access_token'] ?? ''),
            refreshToken: isset($data['refresh_token']) ? (string) $data['refresh_token'] : null,
            expiresIn: (int) ($data['expires_in'] ?? 0),
            scope: (string) ($data['scope'] ?? ''),
            tokenType: (string) ($data['token_type'] ?? 'Bearer'),
        );
    }

    public function isComplete(): bool
    {
        return $this->accessToken !== '';
    }

    public function jsonSerialize(): mixed
    {
        // Never expose token material through JSON serialisation.
        return [
            'expiresIn' => $this->expiresIn,
            'scope' => $this->scope,
            'tokenType' => $this->tokenType,
            'hasRefreshToken' => $this->refreshToken !== null && $this->refreshToken !== '',
        ];
    }

    public function __debugInfo(): array
    {
        return [
            'accessToken' => '[redacted]',
            'refreshToken' => $this->refreshToken === null ? null : '[redacted]',
            'expiresIn' => $this->expiresIn,
            'scope' => $this->scope,
        ];
    }
}
