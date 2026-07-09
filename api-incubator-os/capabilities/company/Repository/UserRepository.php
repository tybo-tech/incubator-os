<?php
declare(strict_types=1);

final class UserRepository
{
    public function __construct(private PDO $conn) {}

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function listByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE company_id = ? ORDER BY full_name ASC");
        $stmt->execute([$companyId]);
        $rows = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $r;
        }
        return $rows;
    }

    public function create(array $data): array
    {
        $fields = $this->filterWritable($data);
        if (!array_key_exists('company_id', $fields)) {
            $fields['company_id'] = null;
        }
        if (isset($fields['company_id']) && (int)$fields['company_id'] === 0) {
            $fields['company_id'] = 0;
        }
        if (!isset($fields['username'])) {
            if (!empty($fields['email'])) {
                $fields['username'] = $fields['email'];
            } else {
                throw new InvalidArgumentException("Field 'username' or 'email' is required");
            }
        }
        $fields['role'] = $fields['role'] ?? 'Director';
        $fields['status'] = $fields['status'] ?? 'active';
        $fields['id_type'] = $fields['id_type'] ?? 'RSA_ID';

        $sql = "INSERT INTO users (" . implode(',', array_keys($fields)) . ")
                VALUES (" . implode(',', array_fill(0, count($fields), '?')) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($fields));

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function getByUsername(string $username): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private const WRITABLE = [
        'id_type','id_number','company_id','full_name','email','phone',
        'username','role','race','gender','status','password_hash'
    ];

    private function filterWritable(array $data): array
    {
        $fields = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                $fields[$k] = $data[$k];
            }
        }
        if (!empty($data['password']) && empty($fields['password_hash'])) {
            $fields['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        return $fields;
    }
}