<?php

class MetaValueSyncService
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function sync($nodeId, $type, $companyId, $data)
    {
        // 1. Clear existing meta for this node
        $this->deleteByNodeId($nodeId);

        // 2. Flatten and extract
        $flat = $this->flatten($data);

        // 3. Insert all meta values
        $stmt = $this->conn->prepare("
            INSERT INTO meta_values (node_id, company_id, collection_id, `key`, value, path, entity_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($flat as $field) {
            $stmt->execute([
                $nodeId,
                $companyId,
                null, // collection_id is optional here — you can resolve it later
                $field['key'],
                $field['value'],
                $field['path'],
                $type
            ]);
        }
    }

    public function deleteByNodeId($nodeId)
    {
        $stmt = $this->conn->prepare("DELETE FROM meta_values WHERE node_id = ?");
        $stmt->execute([$nodeId]);
    }

    // Recursively flatten JSON data
    private function flatten($data, $prefix = '')
    {
        $flat = [];
        foreach ((array)$data as $key => $value) {
            $path = $prefix ? $prefix . '.' . $key : $key;
            if (is_array($value) || is_object($value)) {
                $flat = array_merge($flat, $this->flatten($value, $path));
            } else {
                $flat[] = [
                    'key' => $key,
                    'value' => (string) $value,
                    'path' => $path
                ];
            }
        }
        return $flat;
    }
}
