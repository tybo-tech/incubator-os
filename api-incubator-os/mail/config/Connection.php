
<?php
include_once 'headers.php';

class Connection
{

    public $databaseName = 'tybocoza_cms';
    private $userName = 'tybocoza_cms';
    private $pass = 'Strong100!@';
    public function connect()
    {
        $conn = null;


        try {
            $conn = new PDO("mysql:host=localhost;dbname=$this->databaseName", $this->userName, $this->pass);
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            echo json_encode($e->getMessage());
        }

        return $conn;
    }

}

?>
