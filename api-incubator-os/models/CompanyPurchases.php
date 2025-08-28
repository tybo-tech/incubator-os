<?php

class CompanyPurchases {
    private $conn;
    private $table_name = "company_purchases";

    // Company Purchase properties
    public $id;
    public $company_id;
    public $purchase_type;
    public $service_provider;
    public $items;
    public $amount;
    public $purchase_order;
    public $invoice_received;
    public $invoice_type;
    public $items_received;
    public $aligned_with_presentation;
    public $source_file;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create purchase record
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET company_id = :company_id,
                      purchase_type = :purchase_type,
                      service_provider = :service_provider,
                      items = :items,
                      amount = :amount,
                      purchase_order = :purchase_order,
                      invoice_received = :invoice_received,
                      invoice_type = :invoice_type,
                      items_received = :items_received,
                      aligned_with_presentation = :aligned_with_presentation,
                      source_file = :source_file";

        $stmt = $this->conn->prepare($query);

        // Sanitize and bind values
        $this->company_id = htmlspecialchars(strip_tags($this->company_id));
        $this->purchase_type = htmlspecialchars(strip_tags($this->purchase_type));
        $this->service_provider = htmlspecialchars(strip_tags($this->service_provider));
        $this->items = htmlspecialchars(strip_tags($this->items));
        $this->amount = htmlspecialchars(strip_tags($this->amount));
        $this->purchase_order = filter_var($this->purchase_order, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->invoice_received = filter_var($this->invoice_received, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->invoice_type = htmlspecialchars(strip_tags($this->invoice_type));
        $this->items_received = filter_var($this->items_received, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->aligned_with_presentation = filter_var($this->aligned_with_presentation, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->source_file = htmlspecialchars(strip_tags($this->source_file));

        $stmt->bindParam(":company_id", $this->company_id);
        $stmt->bindParam(":purchase_type", $this->purchase_type);
        $stmt->bindParam(":service_provider", $this->service_provider);
        $stmt->bindParam(":items", $this->items);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":purchase_order", $this->purchase_order);
        $stmt->bindParam(":invoice_received", $this->invoice_received);
        $stmt->bindParam(":invoice_type", $this->invoice_type);
        $stmt->bindParam(":items_received", $this->items_received);
        $stmt->bindParam(":aligned_with_presentation", $this->aligned_with_presentation);
        $stmt->bindParam(":source_file", $this->source_file);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Read single purchase record
    public function read_single() {
        $query = "SELECT cp.*, c.name as company_name, c.registration_number
                  FROM " . $this->table_name . " cp
                  LEFT JOIN companies c ON cp.company_id = c.id
                  WHERE cp.id = ?
                  LIMIT 0,1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if($row) {
            $this->id = $row['id'];
            $this->company_id = $row['company_id'];
            $this->purchase_type = $row['purchase_type'];
            $this->service_provider = $row['service_provider'];
            $this->items = $row['items'];
            $this->amount = (float)$row['amount'];
            $this->purchase_order = (bool)$row['purchase_order'];
            $this->invoice_received = (bool)$row['invoice_received'];
            $this->invoice_type = $row['invoice_type'];
            $this->items_received = (bool)$row['items_received'];
            $this->aligned_with_presentation = (bool)$row['aligned_with_presentation'];
            $this->source_file = $row['source_file'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];

            return $row;
        }

        return false;
    }

    // Read all purchases with filtering
    public function read($filters = []) {
        $query = "SELECT cp.*, c.name as company_name, c.registration_number
                  FROM " . $this->table_name . " cp
                  LEFT JOIN companies c ON cp.company_id = c.id";

        $conditions = [];
        $params = [];

        // Apply filters
        if (isset($filters['company_id']) && !empty($filters['company_id'])) {
            $conditions[] = "cp.company_id = :company_id";
            $params[':company_id'] = $filters['company_id'];
        }

        if (isset($filters['purchase_type']) && !empty($filters['purchase_type'])) {
            $conditions[] = "cp.purchase_type LIKE :purchase_type";
            $params[':purchase_type'] = '%' . $filters['purchase_type'] . '%';
        }

        if (isset($filters['service_provider']) && !empty($filters['service_provider'])) {
            $conditions[] = "cp.service_provider LIKE :service_provider";
            $params[':service_provider'] = '%' . $filters['service_provider'] . '%';
        }

        if (isset($filters['min_amount']) && !empty($filters['min_amount'])) {
            $conditions[] = "cp.amount >= :min_amount";
            $params[':min_amount'] = $filters['min_amount'];
        }

        if (isset($filters['max_amount']) && !empty($filters['max_amount'])) {
            $conditions[] = "cp.amount <= :max_amount";
            $params[':max_amount'] = $filters['max_amount'];
        }

        if (isset($filters['purchase_order']) && $filters['purchase_order'] !== '') {
            $conditions[] = "cp.purchase_order = :purchase_order";
            $params[':purchase_order'] = filter_var($filters['purchase_order'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['invoice_received']) && $filters['invoice_received'] !== '') {
            $conditions[] = "cp.invoice_received = :invoice_received";
            $params[':invoice_received'] = filter_var($filters['invoice_received'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['items_received']) && $filters['items_received'] !== '') {
            $conditions[] = "cp.items_received = :items_received";
            $params[':items_received'] = filter_var($filters['items_received'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['aligned_with_presentation']) && $filters['aligned_with_presentation'] !== '') {
            $conditions[] = "cp.aligned_with_presentation = :aligned_with_presentation";
            $params[':aligned_with_presentation'] = filter_var($filters['aligned_with_presentation'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "DATE(cp.created_at) >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "DATE(cp.created_at) <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        // Add conditions to query
        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        // Add ordering
        $query .= " ORDER BY cp.created_at DESC, cp.amount DESC";

        // Add pagination if specified
        if (isset($filters['limit']) && is_numeric($filters['limit'])) {
            $offset = isset($filters['offset']) && is_numeric($filters['offset']) ? $filters['offset'] : 0;
            $query .= " LIMIT " . intval($offset) . ", " . intval($filters['limit']);
        }

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt;
    }

    // Update purchase record
    public function update() {
        $query = "UPDATE " . $this->table_name . "
                  SET company_id = :company_id,
                      purchase_type = :purchase_type,
                      service_provider = :service_provider,
                      items = :items,
                      amount = :amount,
                      purchase_order = :purchase_order,
                      invoice_received = :invoice_received,
                      invoice_type = :invoice_type,
                      items_received = :items_received,
                      aligned_with_presentation = :aligned_with_presentation,
                      source_file = :source_file,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        // Sanitize and bind values
        $this->company_id = htmlspecialchars(strip_tags($this->company_id));
        $this->purchase_type = htmlspecialchars(strip_tags($this->purchase_type));
        $this->service_provider = htmlspecialchars(strip_tags($this->service_provider));
        $this->items = htmlspecialchars(strip_tags($this->items));
        $this->amount = htmlspecialchars(strip_tags($this->amount));
        $this->purchase_order = filter_var($this->purchase_order, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->invoice_received = filter_var($this->invoice_received, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->invoice_type = htmlspecialchars(strip_tags($this->invoice_type));
        $this->items_received = filter_var($this->items_received, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->aligned_with_presentation = filter_var($this->aligned_with_presentation, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $this->source_file = htmlspecialchars(strip_tags($this->source_file));
        $this->id = htmlspecialchars(strip_tags($this->id));

        $stmt->bindParam(":company_id", $this->company_id);
        $stmt->bindParam(":purchase_type", $this->purchase_type);
        $stmt->bindParam(":service_provider", $this->service_provider);
        $stmt->bindParam(":items", $this->items);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":purchase_order", $this->purchase_order);
        $stmt->bindParam(":invoice_received", $this->invoice_received);
        $stmt->bindParam(":invoice_type", $this->invoice_type);
        $stmt->bindParam(":items_received", $this->items_received);
        $stmt->bindParam(":aligned_with_presentation", $this->aligned_with_presentation);
        $stmt->bindParam(":source_file", $this->source_file);
        $stmt->bindParam(":id", $this->id);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Delete purchase record
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(1, $this->id);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Get purchases count
    public function count($filters = []) {
        $query = "SELECT COUNT(*) as total FROM " . $this->table_name . " cp";

        $conditions = [];
        $params = [];

        // Apply same filters as read method
        if (isset($filters['company_id']) && !empty($filters['company_id'])) {
            $conditions[] = "cp.company_id = :company_id";
            $params[':company_id'] = $filters['company_id'];
        }

        if (isset($filters['purchase_type']) && !empty($filters['purchase_type'])) {
            $conditions[] = "cp.purchase_type LIKE :purchase_type";
            $params[':purchase_type'] = '%' . $filters['purchase_type'] . '%';
        }

        if (isset($filters['service_provider']) && !empty($filters['service_provider'])) {
            $conditions[] = "cp.service_provider LIKE :service_provider";
            $params[':service_provider'] = '%' . $filters['service_provider'] . '%';
        }

        if (isset($filters['min_amount']) && !empty($filters['min_amount'])) {
            $conditions[] = "cp.amount >= :min_amount";
            $params[':min_amount'] = $filters['min_amount'];
        }

        if (isset($filters['max_amount']) && !empty($filters['max_amount'])) {
            $conditions[] = "cp.amount <= :max_amount";
            $params[':max_amount'] = $filters['max_amount'];
        }

        if (isset($filters['purchase_order']) && $filters['purchase_order'] !== '') {
            $conditions[] = "cp.purchase_order = :purchase_order";
            $params[':purchase_order'] = filter_var($filters['purchase_order'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['invoice_received']) && $filters['invoice_received'] !== '') {
            $conditions[] = "cp.invoice_received = :invoice_received";
            $params[':invoice_received'] = filter_var($filters['invoice_received'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['items_received']) && $filters['items_received'] !== '') {
            $conditions[] = "cp.items_received = :items_received";
            $params[':items_received'] = filter_var($filters['items_received'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['aligned_with_presentation']) && $filters['aligned_with_presentation'] !== '') {
            $conditions[] = "cp.aligned_with_presentation = :aligned_with_presentation";
            $params[':aligned_with_presentation'] = filter_var($filters['aligned_with_presentation'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "DATE(cp.created_at) >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "DATE(cp.created_at) <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        // Add conditions to query
        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total'];
    }

    // Get purchase statistics
    public function getPurchaseStatistics($company_id = null) {
        $conditions = [];
        $params = [];

        if ($company_id) {
            $conditions[] = "company_id = :company_id";
            $params[':company_id'] = $company_id;
        }

        $where_clause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

        $query = "SELECT
                    COUNT(*) as total_purchases,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount,
                    SUM(CASE WHEN purchase_order = 1 THEN 1 ELSE 0 END) as with_purchase_order,
                    SUM(CASE WHEN invoice_received = 1 THEN 1 ELSE 0 END) as with_invoice,
                    SUM(CASE WHEN items_received = 1 THEN 1 ELSE 0 END) as items_delivered,
                    SUM(CASE WHEN aligned_with_presentation = 1 THEN 1 ELSE 0 END) as aligned_purchases,
                    COUNT(DISTINCT purchase_type) as unique_types,
                    COUNT(DISTINCT service_provider) as unique_providers
                  FROM " . $this->table_name . " " . $where_clause;

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get purchase types breakdown
    public function getPurchaseTypeBreakdown($company_id = null) {
        $conditions = [];
        $params = [];

        if ($company_id) {
            $conditions[] = "company_id = :company_id";
            $params[':company_id'] = $company_id;
        }

        $where_clause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

        $query = "SELECT
                    purchase_type,
                    COUNT(*) as count,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount
                  FROM " . $this->table_name . " " . $where_clause . "
                  GROUP BY purchase_type
                  ORDER BY total_amount DESC";

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt;
    }

    // Get service provider breakdown
    public function getServiceProviderBreakdown($company_id = null) {
        $conditions = [];
        $params = [];

        if ($company_id) {
            $conditions[] = "company_id = :company_id";
            $params[':company_id'] = $company_id;
        }

        $where_clause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

        $query = "SELECT
                    service_provider,
                    COUNT(*) as count,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount
                  FROM " . $this->table_name . " " . $where_clause . "
                  GROUP BY service_provider
                  ORDER BY total_amount DESC";

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt;
    }

    // Get monthly purchase trends
    public function getMonthlyTrends($company_id = null, $year = null) {
        $conditions = [];
        $params = [];

        if ($company_id) {
            $conditions[] = "company_id = :company_id";
            $params[':company_id'] = $company_id;
        }

        if ($year) {
            $conditions[] = "YEAR(created_at) = :year";
            $params[':year'] = $year;
        }

        $where_clause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

        $query = "SELECT
                    YEAR(created_at) as year,
                    MONTH(created_at) as month,
                    MONTHNAME(created_at) as month_name,
                    COUNT(*) as purchase_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount
                  FROM " . $this->table_name . " " . $where_clause . "
                  GROUP BY YEAR(created_at), MONTH(created_at)
                  ORDER BY YEAR(created_at) DESC, MONTH(created_at) DESC";

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt;
    }

    // Validate purchase data
    public function validate($data) {
        $errors = [];

        if (empty($data['company_id']) || !is_numeric($data['company_id'])) {
            $errors[] = "Valid company ID is required";
        }

        if (empty($data['purchase_type'])) {
            $errors[] = "Purchase type is required";
        }

        if (empty($data['service_provider'])) {
            $errors[] = "Service provider is required";
        }

        if (empty($data['items'])) {
            $errors[] = "Items description is required";
        }

        if (!isset($data['amount']) || !is_numeric($data['amount']) || $data['amount'] < 0) {
            $errors[] = "Valid amount is required (must be >= 0)";
        }

        return $errors;
    }

    // Search purchases
    public function search($search_term, $company_id = null) {
        $conditions = ["(cp.purchase_type LIKE :search OR cp.service_provider LIKE :search OR cp.items LIKE :search OR cp.invoice_type LIKE :search)"];
        $params = [':search' => '%' . $search_term . '%'];

        if ($company_id) {
            $conditions[] = "cp.company_id = :company_id";
            $params[':company_id'] = $company_id;
        }

        $query = "SELECT cp.*, c.name as company_name, c.registration_number
                  FROM " . $this->table_name . " cp
                  LEFT JOIN companies c ON cp.company_id = c.id
                  WHERE " . implode(" AND ", $conditions) . "
                  ORDER BY cp.created_at DESC";

        $stmt = $this->conn->prepare($query);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt;
    }
}

?>
