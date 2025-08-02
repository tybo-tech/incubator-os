<?php

 function  getUuid($conn){
    $stmt = $conn->prepare("SELECT uuid() as Id from dual");
    $stmt->execute(array());

    if ($stmt->rowCount()) {
        $uuid = $stmt->fetch(PDO::FETCH_ASSOC);
        return  $uuid['Id'];
    }
    }