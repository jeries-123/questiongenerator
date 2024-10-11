<?php
    
    include "connection.php";

    $conn = OpenConnection();

    $query = "SELECT * FROM `secrets` WHERE id = '5555'";
    $result = $conn->query($query);

    if($result){
        $secretDetails = mysqli_fetch_all($result, MYSQLI_ASSOC);
        echo json_encode($secretDetails);
    }

