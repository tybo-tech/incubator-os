<?php
declare(strict_types=1);

final class FinancialIndicatorLinkRepository
{
    public function __construct(private PDO $conn) {}

    public function createRequest(int $companyId, int $financialYear, int $month, string $token, string $expiresAt): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO nodes (type, token, company_id, data, created_by)
            VALUES (?, ?, ?, ?, ?)
        ");
        $data = json_encode([
            'type' => 'financial_indicator_request',
            'company_id' => $companyId,
            'financial_year' => $financialYear,
            'month' => $month,
            'expires_at' => $expiresAt,
            'status' => 'pending',
        ]);
        $stmt->execute(['financial_indicator_request', $token, $companyId, $data, null]);
        return $this->getByToken($token);
    }

    public function getByToken(string $token): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM nodes
            WHERE token = ?
        ");
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['data'] = json_decode($row['data'], true) ?? [];
        return $row;
    }

    public function markCompleted(int $id): void
    {
        $stmt = $this->conn->prepare("
            UPDATE nodes
            SET data = JSON_SET(data, '$.status', 'completed')
            WHERE id = ?
        ");
        $stmt->execute([$id]);
    }

    public function isTokenUsed(string $token): bool
    {
        $request = $this->getByToken($token);
        if (!$request) return false;
        $data = $request['data'];
        return ($data['status'] ?? '') === 'completed';
    }
}
