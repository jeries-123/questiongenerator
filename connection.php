<?php
   function OpenConnection(){
      
      $host = "localhost";
      $username = "aiiovdft_lms";
      $password = "strong#dux13";
      $dbname = "aiiovdft_profdux";
      
      $conn = new mysqli($host, $username, $password, $dbname) or die("Connection to database failed: %s\n". $conn -> error);

      return $conn;
   }
 
   function CloseConnection($conn){
      $conn -> close();
   }