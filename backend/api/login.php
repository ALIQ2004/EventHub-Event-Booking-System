
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/jwt_config.php";
require_once __DIR__ . "/../vendor/autoload.php";

use Firebase\JWT\JWT;

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Allow: POST");
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Only POST requests are allowed"
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input) ||
    !isset($input["email"], $input["password"]) ||
    !is_string($input["email"]) ||
    !is_string($input["password"]) ||
    !filter_var($input["email"], FILTER_VALIDATE_EMAIL) ||
    $input["password"] === "") {

    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Valid email and password are required"
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT user_id, full_name, email,
                password_hash, role
         FROM users
         WHERE email = ?
         LIMIT 1"
    );

    $stmt->execute([$input["email"]]);
    $user = $stmt->fetch();

    if (!$user ||
        !password_verify(
            $input["password"],
            $user["password_hash"]
        )) {

        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password"
        ]);
        exit;
    }

    $now = time();

    $payload = [
        "iss" => $jwt_issuer,
        "iat" => $now,
        "nbf" => $now,
        "exp" => $now + $jwt_expiration,
        "sub" => (string)$user["user_id"],
        "role" => $user["role"]
    ];

    $token = JWT::encode($payload, $jwt_secret, "HS256");

    http_response_code(200);

    echo json_encode([
        "success" => true,
        "message" => "Login successful",
        "token_type" => "Bearer",
        "token" => $token,
        "expires_in" => $jwt_expiration,
        "user" => [
            "user_id" => $user["user_id"],
            "full_name" => $user["full_name"],
            "email" => $user["email"],
            "role" => $user["role"]
        ]
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to process login"
    ]);
}
