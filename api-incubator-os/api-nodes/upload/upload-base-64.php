<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token');
//require "conn.php";
$input = json_decode(file_get_contents("php://input"));
if ($input->images) {
    $images = $input->images;
    $returnResults =  array();

    foreach ($images as $data) {
        list($type, $data) = explode(';', $data);
        list(, $data)      = explode(',', $data);
        $data = base64_decode($data);
        $type = explode("/", $type)[1];
        if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
            throw new \Exception('invalid image type');
        }
    
    
        if ($data === false) {
            throw new \Exception('base64_decode failed');
        }
    
        $file_name = "uploads/".time().rand(10000 , 99999 ).".".$type;
         file_put_contents($file_name, $data);
         array_push($returnResults, $file_name);
    }

    echo json_encode($returnResults);
    

}
