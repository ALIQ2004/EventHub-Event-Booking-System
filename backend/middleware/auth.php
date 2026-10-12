
<?php
require_once __DIR__ . "/../config/jwt_config.php";
require_once __DIR__ . "/../vendor/autoload.php";

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function authenticate($allowedRoles = []) {
    global $jwt_secret, $jwt_issuer;

    $headers = function_exists("getallheaders")
        ? getallheaders() : [];

    $authorization = "";

    foreach ($headers as $name => $value) {
        if (strtolower($name) === "authorization") {
            $authorization = $value;
            break;
        }
    }

    if (!$authorization) {
        $authorization =
            $_SERVER["HTTP_AUTHORIZATION"] ?? "";
    }

    if (!preg_match(
        '/^Bearer\s+(\S+)$/i',
        $authorization,
        $matches
    )) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Authentication token required"
        ]);
        exit;
    }

    try {
        $decoded = JWT::decode(
            $matches[1],
            new Key($jwt_secret, "HS256")
        );

        if (($decoded->iss ?? null) !== $jwt_issuer ||
            !isset($decoded->sub, $decoded->role)) {
            throw new Exception("Invalid token claims");
        }

        $role = $decoded->role;

        if ($allowedRoles &&
            !in_array($role, $allowedRoles, true)) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Access denied for this role"
            ]);
            exit;
        }

        return [
            "user_id" => (int)$decoded->sub,
            "role" => $role
        ];

    } catch (\Firebase\JWT\ExpiredException $e) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Token has expired"
        ]);
        exit;

    } catch (Throwable $e) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Invalid authentication token"
        ]);
        exit;
    }
}
