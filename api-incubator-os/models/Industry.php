<?php
declare(strict_types=1);

class Industry
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================ Create / Update ============================ */

    public function add(string $name, ?int $parentId = null): array
    {
        $sql = "INSERT INTO industries (name, parent_id) VALUES (?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$name, $parentId]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = ['name','parent_id'];
        $sets = [];
        $params = [];

        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[] = "$k = ?";
                $params[] = $fields[$k];
            }
        }
        if (!$sets) return $this->getById($id);

        $params[] = $id;
        $sql = "UPDATE industries SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* ================================ Read ================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM industries WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByName(string $name): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM industries WHERE name = ?");
        $stmt->execute([$name]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /** Flat list, optionally only roots (parent_id IS NULL) or by parent. */
    public function list(array $opts = []): array
    {
        $where = [];
        $params = [];

        if (array_key_exists('parent_id', $opts)) {
            if ($opts['parent_id'] === null) {
                $where[] = "parent_id IS NULL";
            } else {
                $where[] = "parent_id = ?";
                $params[] = (int)$opts['parent_id'];
            }
        }

        $sql = "SELECT * FROM industries";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY name ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($r);
        }
        return $out;
    }

    /** Children of a given industry. */
    public function listChildren(int $parentId): array
    {
        return $this->list(['parent_id' => $parentId]);
    }

    /** Simple in-memory tree: [{id,name,parent_id,children:[...]}] */
    public function listTree(): array
    {
        $stmt = $this->conn->query("SELECT * FROM industries ORDER BY name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $byId = [];
        foreach ($rows as $r) {
            $r = $this->castRow($r);
            $r['children'] = [];
            $byId[$r['id']] = $r;
        }
        $roots = [];
        foreach ($byId as $id => &$node) {
            if ($node['parent_id'] === null) {
                $roots[] = &$node;
            } else {
                if (isset($byId[$node['parent_id']])) {
                    $byId[$node['parent_id']]['children'][] = &$node;
                } else {
                    // Orphaned node → treat as root
                    $roots[] = &$node;
                }
            }
        }
        return $roots;
    }

    /* ================================ Delete ================================ */

    public function delete(int $id): bool
    {
        // FK behavior:
        // - industries.parent_id → ON DELETE SET NULL (children become roots)
        // - companies.industry_id → ON DELETE SET NULL (companies disassociate)
        $stmt = $this->conn->prepare("DELETE FROM industries WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ============================= Conveniences ============================= */

    /** Idempotent create by name; returns existing if present. */
    public function ensure(string $name, ?int $parentId = null): array
    {
        $existing = $this->getByName($name);
        if ($existing) return $existing;

        return $this->add($name, $parentId);
    }

    /** Ensure with parent specified by name (creates parent if missing). */
    public function ensureWithParent(string $name, ?string $parentName): array
    {
        $parentId = null;
        if ($parentName) {
            $parent = $this->ensure($parentName, null);
            $parentId = $parent['id'];
        }
        return $this->ensure($name, $parentId);
    }

    /** Reassign all companies currently pointing at $fromId → $toId (or NULL). */
    public function reassignCompanies(int $fromId, ?int $toId): int
    {
        $stmt = $this->conn->prepare("UPDATE companies SET industry_id = ? WHERE industry_id = ?");
        $stmt->execute([$toId, $fromId]);
        return $stmt->rowCount();
    }

    /* ================================= Utils ================================ */

    private function castRow(array $row): array
    {
        foreach (['id','parent_id'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            } else {
                $row[$k] = $row[$k] === null ? null : $row[$k];
            }
        }
        return $row;
    }
}
