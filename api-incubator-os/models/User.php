<?php
declare(strict_types=1);

class User
{
    private PDO $conn;

    private const WRITABLE = [
        'id_type','id_number','company_id','full_name','email','phone',
        'username','role','race','gender','status','password_hash'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /** Create a user (password: pass plaintext via 'password'; or pre-hash via 'password_hash'). */
    public function add(array $data): array
    {
        $fields = $this->prepareFields($data);

        // Minimal required: company_id + username (we’ll default username from email if missing)
        if (!isset($fields['company_id'])) {
            throw new InvalidArgumentException("Field 'company_id' is required");
        }
        if (!isset($fields['username'])) {
            if (!empty($fields['email'])) {
                $fields['username'] = $fields['email'];
            } else {
                throw new InvalidArgumentException("Field 'username' or 'email' is required");
            }
        }

        // Defaults aligned with schema
        $fields['role']   = $fields['role']   ?? 'Director';
        $fields['status'] = $fields['status'] ?? 'active';

        $sql = "INSERT INTO users (" . implode(',', array_keys($fields)) . ")
                VALUES (" . implode(',', array_fill(0, count($fields), '?')) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($fields));

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /** Patch-style update (only provided keys are updated). */
    public function update(int $id, array $data): ?array
    {
        $fields = $this->prepareFields($data);
        if (!$fields) return $this->getById($id);

        $sets = [];
        $params = [];
        foreach ($fields as $k => $v) {
            $sets[] = "{$k} = ?";
            $params[] = $v;
        }
        $params[] = $id;

        $sql = "UPDATE users SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByUsername(string $username): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE company_id = ? ORDER BY full_name ASC");
        $stmt->execute([$companyId]);
        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($r);
        }
        return $out;
    }

    /** Search users (q matches name/email/username/phone), plus filters. */
    public function search(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['q'])) {
            $q = '%' . $filters['q'] . '%';
            $where[] = "(full_name LIKE ? OR email LIKE ? OR username LIKE ? OR phone LIKE ?)";
            array_push($params, $q, $q, $q, $q);
        }
        if (!empty($filters['company_id'])) {
            $where[] = "company_id = ?";
            $params[] = (int)$filters['company_id'];
        }
        if (!empty($filters['role'])) {
            $where[] = "role = ?";
            $params[] = $filters['role'];
        }
        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }

        $sql = "SELECT * FROM users";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";

        $stmt = $this->conn->prepare($sql);
        foreach ($params as $i => $v) {
            $stmt->bindValue($i + 1, $v);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($r);
        }
        return $out;
    }

    /* ------------------ Helpers aligned to your defaults ------------------ */

    /**
     * Seed a user from a companies row (array) using your default rules:
     * - role => 'Director'
     * - race  => 'Black' if company.black_ownership OR company.black_women_ownership
     * - gender => 'Female' if company.black_women_ownership
     * - full_name (optional) can be omitted; use contact name later if you add it
     * - username defaults to email if not given
     */
    public function seedFromCompanyRow(array $company, array $overrides = []): array
    {
        $race = null;
        $gender = null;

        $isBlack  = !empty($company['black_ownership']) || !empty($company['black_women_ownership']);
        $isFemale = !empty($company['black_women_ownership']);

        if ($isBlack)  $race = 'Black';
        if ($isFemale) $gender = 'Female';

        $payload = array_merge([
            'company_id' => (int)$company['id'],
            'full_name'  => $company['contact_person'] ?? null, // if you later keep it; else null
            'email'      => $company['email_address'] ?? null,
            'phone'      => $company['contact_number'] ?? null,
            'username'   => $company['email_address'] ?? null,
            'role'       => 'Director',
            'race'       => $race,
            'gender'     => $gender,
            'status'     => 'active',
        ], $overrides);

        return $this->add($payload);
    }

    /* ----------------------------- internals ----------------------------- */

    private function prepareFields(array $data): array
    {
        $fields = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                $fields[$k] = $data[$k];
            }
        }

        // Support plaintext password for convenience
        if (!empty($data['password']) && empty($fields['password_hash'])) {
            $fields['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        // Casts / normalizations
        if (isset($fields['company_id'])) $fields['company_id'] = (int)$fields['company_id'];

        return $fields;
    }

    private function castRow(array $row): array
    {
        foreach (['id','company_id'] as $i) {
            if (isset($row[$i])) $row[$i] = (int)$row[$i];
        }
        return $row;
    }
}
