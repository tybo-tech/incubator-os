<?php

require_once 'MetaValueSyncService.php';

class Node
{
    private $conn;
    private $metaSync;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->metaSync = new MetaValueSyncService($db);
    }

    public function add($type, $data, $companyId = null, $parentId = null, $createdBy = null)
    {
        $query = "INSERT INTO nodes (type, company_id, data, parent_id, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            $type,
            $companyId,
            json_encode($data),
            $parentId,
            $createdBy,
            $createdBy
        ]);

        $id = $this->conn->lastInsertId();

        // Sync flat meta fields
        $this->metaSync->sync($id, $type, $companyId, $data);

        return $this->getById($id);
    }

    public function update($id, $data, $updatedBy = null)
    {
        $query = "UPDATE nodes SET data = ?, updated_by = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            json_encode($data),
            $updatedBy,
            $id
        ]);

        // Fetch updated node for metadata sync
        $node = $this->getById($id);

        // Sync updated meta values
        $this->metaSync->sync($id, $node['type'], $node['company_id'], $data);

        return $node;
    }

    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount()) {
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            $item['data'] = json_decode($item['data']);
            return $item;
        }

        return null;
    }

    public function getByType($type)
    {
        $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE type = ?");
        $stmt->execute([$type]);

        $results = [];
        while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $item['data'] = json_decode($item['data']);
            $results[] = $item;
        }

        return $results;
    }

    // get by company_id
    public function getByCompanyId($companyId, $type = null)
    {
        if ($type) {
            $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE company_id = ? AND type = ?");
            $stmt->execute([$companyId, $type]);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE company_id = ?");
            $stmt->execute([$companyId]);
        }

        if ($stmt->rowCount() === 0) {
            return [];
        }

        $results = [];
        while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $item['data'] = json_decode($item['data']);
            $results[] = $item;
        }

        return $results;
    }

    public function search($type = null, $parentId = null)
    {
        $query = "SELECT * FROM nodes WHERE 1=1";
        $params = [];

        if ($type !== null) {
            $query .= " AND type = ?";
            $params[] = $type;
        }

        if ($parentId !== null) {
            $query .= " AND parent_id = ?";
            $params[] = $parentId;
        }

        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);

        $results = [];
        while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $item['data'] = json_decode($item['data']);
            $results[] = $item;
        }

        return $results;
    }

    public function delete($id)
    {
        // Remove from meta_values as well
        $this->metaSync->deleteByNodeId($id);

        $stmt = $this->conn->prepare("DELETE FROM nodes WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function addRange($items)
    {
        $this->conn->beginTransaction();
        try {
            $results = [];
            foreach ($items as $item) {
                $results[] = $this->add($item->type, $item->data, $item->company_id ?? null, $item->parent_id ?? null, $item->created_by ?? null);
            }
            $this->conn->commit();
            return $results;
        } catch (Exception $e) {
            $this->conn->rollBack();
            return ['ERROR', $e->getMessage()];
        }
    }

    public function updateRange($items)
    {
        $this->conn->beginTransaction();
        try {
            $results = [];
            foreach ($items as $item) {
                $results[] = $this->update($item->id, $item->data, $item->updated_by ?? null);
            }
            $this->conn->commit();
            return $results;
        } catch (Exception $e) {
            $this->conn->rollBack();
            return ['ERROR', $e->getMessage()];
        }
    }
}
