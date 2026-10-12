
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    header("Allow: GET");
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed"
    ]);
    exit;
}

// Only administrators can retrieve all users.
$authenticatedUser = authenticate(["admin"]);

try {
    $stmt = $pdo->prepare(
        "SELECT user_id, full_name, email,
                phone, role, created_at
         FROM users
         ORDER BY user_id ASC"
    );

    $stmt->execute();

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "total_users" => count($users),
        "data" => $users
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to retrieve users"
    ]);
}
