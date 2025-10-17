<?php
include_once 'headers.php';
include_once '../common/common.php';

class Database
{
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;

    public function __construct()
    {
        // Default to server config
        // $this->setServer();

        // Collect locally
        // Comment out before deploying
        $this->setLocal();
    }

    public function setLocal()
    {
        $this->host = 'mysql'; // For Docker: matches service name
        $this->db_name = 'incubator_os';
        $this->username = 'docker';
        $this->password = 'docker';
    }

    public function setServer()
    {
        $this->host = 'localhost';
        $this->db_name = 'rbttaces_api';
        $this->username = 'rbttaces_api';
        $this->password = 'Harder01!';
    }

    public function connect()
    {
        $this->conn = null;
        // Remove the duplicate setLocal() call - use constructor config
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->db_name}";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage(), "loaction" => "Database.php: connect"]);
        }
        return $this->conn;
    }

    public function getGuid($conn)
    {
        $stmt = $conn->prepare("SELECT UUID() as ID");
        $stmt->execute();

        if ($stmt->rowCount()) {
            $uuid = $stmt->fetch(PDO::FETCH_ASSOC);
            return $uuid['ID'];
        }
        return null;
    }
}
