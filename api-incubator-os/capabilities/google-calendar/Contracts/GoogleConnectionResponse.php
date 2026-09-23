<?php
declare(strict_types=1);

/**
 * The ONLY shape the browser ever receives describing a Google connection
 * (Sprint 010 Phase 2).
 *
 * Security: this DTO deliberately excludes the ciphertext, nonce, tag, raw token
 * expiry internals and any configuration value. The browser learns the
 * connection STATUS and the connected account email — nothing that could be used
 * to reconstruct or replay a credential.
 *
 * `status` values:
 *   disconnected      — no connection row for this user
 *   connected         — usable; tokens present and not flagged for reconnect
 *   needs_reconnect   — refresh token invalid/revoked; user must reconnect
 *   revoked           — connection revoked (kept for audit identity)
 *   account_mismatch  — a reconnect used a different Google account while
 *                       published mappings exist; reconciliation is required
 */
final class GoogleConnectionResponse implements JsonSerializable
{
    public function __construct(
        public readonly string $status,
        public readonly ?string $googleAccountEmail = null,
        public readonly ?string $calendarId = null,
        public readonly ?string $connectedAt = null,
        public readonly ?string $lastSyncedAt = null,
        public readonly bool $needsReconnect = false,
        public readonly ?string $pendingAccountEmail = null,
    ) {}

    public static function disconnected(): self
    {
        return new self(status: 'disconnected');
    }

    public function jsonSerialize(): mixed
    {
        return [
            'status' => $this->status,
            'googleAccountEmail' => $this->googleAccountEmail,
            'calendarId' => $this->calendarId,
            'connectedAt' => $this->connectedAt,
            'lastSyncedAt' => $this->lastSyncedAt,
            'needsReconnect' => $this->needsReconnect,
            'pendingAccountEmail' => $this->pendingAccountEmail,
        ];
    }
}
