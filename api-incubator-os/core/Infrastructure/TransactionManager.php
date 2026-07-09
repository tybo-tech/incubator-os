<?php
declare(strict_types=1);

final class TransactionManager
{
    public function __construct(private PDO $conn) {}

    public function execute(callable $fn): mixed
    {
        $this->conn->beginTransaction();
        try {
            $result = $fn();
            $this->conn->commit();
            return $result;
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}