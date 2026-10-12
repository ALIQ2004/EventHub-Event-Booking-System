
<?php
header("Content-Type: application/json");

require_once __DIR__ . "/database.php";

echo json_encode([
    "success" => true,
    "message" => "Database connected successfully!",
    "database" => "event_booking_db"
]);
?>
