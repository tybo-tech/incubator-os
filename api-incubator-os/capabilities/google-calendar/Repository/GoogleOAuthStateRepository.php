<?php
declare(strict_types=1);

/**
 * Persistence for OAuth `state` records (Sprint 010 Phase 2).
 *
 * The raw state is NEVER stored — only its SHA-256 hash. Consumption is atomic:
 * a single UPDATE sets `consumed_at` only when the row is unconsumed, unexpired
 * and bound to the same tenant/user, so a replayed or cross-user state matches
 * zero rows.
 */
final class GoogleOAuthStateRepository
{
    public function __construct(private readonly PDO $db) {}

    public function create(int $tenantId, int $userId, string $stateHash, string $returnPath, int $ttlSeconds): void
    {
        $expiresAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
            ->modify('+' . max(1, $ttlSeconds) . ' seconds')
            ->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare(
            'INSERT INTO google_oauth_states (state_hash, tenant_id, user_id, return_path, expires_at)
             VALUES (:hash, :tenant, :user, :path, :expires)'
        );
        $stmt->execute([
            'hash' => $stateHash,
            'tenant' => $tenantId,
            'user' => $userId,
            'path' => $returnPath,
            'expires' => $expiresAt,
        ]);
    }

    /**
     * Atomically consume a state. Returns the row (including `return_path`) when
     * it was valid and unconsumed, or null when missing/expired/reused/wrong-user.
     *
     * @return array<string,mixed>|null
     */
    public function consume(string $stateHash, int $tenantId, int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'UPDATE google_oauth_states
                SET consumed_at = UTC_TIMESTAMP()
              WHERE state_hash = :hash
                AND consumed_at IS NULL
                AND expires_at > UTC_TIMESTAMP()
                AND tenant_id = :tenant
                AND user_id = :user'
        );
        $stmt->execute(['hash' => $stateHash, 'tenant' => $tenantId, 'user' => $userId]);

        if ($stmt->rowCount() !== 1) {
            return null;
        }

        $select = $this->db->prepare(
            'SELECT * FROM google_oauth_states WHERE state_hash = :hash LIMIT 1'
        );
        $select->execute(['hash' => $stateHash]);
        $row = $select->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** Opportunistic cleanup of expired/consumed rows. Best-effort. */
    public function deleteStale(): int
    {
        $stmt = $this->db->prepare(
            'DELETE FROM google_oauth_states
              WHERE expires_at < UTC_TIMESTAMP() - INTERVAL 1 DAY
                 OR (consumed_at IS NOT NULL AND consumed_at < UTC_TIMESTAMP() - INTERVAL 1 DAY)'
        );
        $stmt->execute();
        return $stmt->rowCount();
    }
}
