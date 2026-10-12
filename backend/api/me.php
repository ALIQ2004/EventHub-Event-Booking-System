
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../middleware/auth.php";

// Only allow GET requests.
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    header("Allow: GET");
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed"
    ]);

    exit;
}

// Allow all authenticated EventHub user roles.
$user = authenticate([
    "customer",
    "organiser",
    "admin"
]);

require_once __DIR__ . "/../config/database.php";

// Retrieve the authenticated account from MySQL.
$stmt = $pdo->prepare(
    "SELECT user_id, full_name, email, role
     FROM users
     WHERE user_id = ?
     LIMIT 1"
);

$stmt->execute([$user["user_id"]]);

$record = $stmt->fetch(PDO::FETCH_ASSOC);

// Ensure the account still exists and its role matches.
if (!$record || $record["role"] !== $user["role"]) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Account is no longer authorised"
    ]);

    exit;
}

// Return the authenticated user profile.
echo json_encode([
    "success" => true,
    "user" => $record
]);
