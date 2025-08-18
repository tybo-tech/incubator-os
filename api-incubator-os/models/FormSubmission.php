<?php
declare(strict_types=1);

class FormSubmission
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    /**
     * Create a submission snapshot for a company.
     * If $formId is null, provide $formKey to resolve it.
     * Auto-increments version per (form_id, company_id).
     */
    public function create(array $payload, int $companyId, ?int $formId = null, ?string $formKey = null, ?int $createdBy = null, ?string $effectiveAt = null): array
    {
        if ($formId === null) {
            if (!$formKey) throw new InvalidArgumentException("formId or formKey required");
            $formId = $this->resolveFormId($formKey);
        }

        // determine next version
        $stmt = $this->conn->prepare("SELECT COALESCE(MAX(version),0)+1 AS next_ver
                                      FROM form_submissions WHERE form_id = ? AND company_id = ?");
        $stmt->execute([$formId, $companyId]);
        $nextVer = (int)$stmt->fetchColumn();

        $sql = "INSERT INTO form_submissions (form_id, company_id, payload, version, effective_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $formId,
            $companyId,
            json_encode($payload, JSON_UNESCAPED_UNICODE),
            $nextVer,
            $effectiveAt,                   // may be null
            $createdBy                      // may be null
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /** Fetch a single submission */
    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM form_submissions WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['payload'] = json_decode($row['payload'], true);
        return $row;
    }

    /** Latest submission for a given (form, company) */
    public function getLatestForCompany(int $companyId, ?int $formId = null, ?string $formKey = null): ?array
    {
        if ($formId === null) {
            if (!$formKey) throw new InvalidArgumentException("formId or formKey required");
            $formId = $this->resolveFormId($formKey);
        }

        $stmt = $this->conn->prepare(
            "SELECT * FROM form_submissions
             WHERE form_id = ? AND company_id = ?
             ORDER BY version DESC, id DESC
             LIMIT 1"
        );
        $stmt->execute([$formId, $companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['payload'] = json_decode($row['payload'], true);
        return $row;
    }

    /** Full history list with pagination */
    public function getHistory(int $companyId, ?int $formId = null, ?string $formKey = null, int $limit = 50, int $offset = 0): array
    {
        if ($formId === null) {
            if (!$formKey) throw new InvalidArgumentException("formId or formKey required");
            $formId = $this->resolveFormId($formKey);
        }

        $stmt = $this->conn->prepare(
            "SELECT * FROM form_submissions
             WHERE form_id = ? AND company_id = ?
             ORDER BY version DESC, id DESC
             LIMIT ? OFFSET ?"
        );
        $stmt->bindValue(1, $formId, PDO::PARAM_INT);
        $stmt->bindValue(2, $companyId, PDO::PARAM_INT);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT);
        $stmt->bindValue(4, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['payload'] = json_decode($row['payload'], true);
            $out[] = $row;
        }
        return $out;
    }

    /** Update (patch) an existing submission payload */
    public function updatePayload(int $id, array $payload, ?int $updatedBy = null): ?array
    {
        $stmt = $this->conn->prepare("UPDATE form_submissions
                                      SET payload = ?, updated_at = NOW()
                                      WHERE id = ?");
        $stmt->execute([json_encode($payload, JSON_UNESCAPED_UNICODE), $id]);
        // note: if you want to track updated_by, add a column or keep in payload meta
        return $this->getById($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM form_submissions WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Helper: resolve form_key -> id */
    private function resolveFormId(string $formKey): int
    {
        $stmt = $this->conn->prepare("SELECT id FROM form_definitions WHERE form_key = ? AND is_active = 1");
        $stmt->execute([$formKey]);
        $id = $stmt->fetchColumn();
        if (!$id) {
            throw new RuntimeException("Active form not found for key: {$formKey}");
        }
        return (int)$id;
    }
}
