
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth.php";

$method = $_SERVER["REQUEST_METHOD"];

function venueResponse($status, $success, $message) {
    http_response_code($status);
    echo json_encode([
        "success" => $success,
        "message" => $message
    ]);
    exit;
}

try {
    // GET - Retrieve venues
    if ($method === "GET") {
        $stmt = $pdo->query(
            "SELECT * FROM venues ORDER BY venue_id ASC"
        );

        $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "total_venues" => count($venues),
            "data" => $venues
        ]);
        exit;
    }

    // POST - Create venue
    if ($method === "POST") {
        authenticate(["admin", "organiser"]);

        $data = json_decode(
            file_get_contents("php://input"), true
        );

        if (!is_array($data) ||
            !isset($data["venue_name"], $data["address"],
                    $data["city"], $data["state"],
                    $data["capacity"]) ||
            !is_string($data["venue_name"]) ||
            !is_string($data["address"]) ||
            !is_string($data["city"]) ||
            !is_string($data["state"]) ||
            trim($data["venue_name"]) === "" ||
            trim($data["address"]) === "" ||
            trim($data["city"]) === "" ||
            trim($data["state"]) === "" ||
            filter_var($data["capacity"], FILTER_VALIDATE_INT) === false ||
            (int)$data["capacity"] <= 0) {
            venueResponse(422, false, "Invalid venue information");
        }

        $stmt = $pdo->prepare(
            "INSERT INTO venues
             (venue_name, address, city, state,
              capacity, facilities, status)
             VALUES (?, ?, ?, ?, ?, ?, 'available')"
        );

        $stmt->execute([
            trim($data["venue_name"]),
            trim($data["address"]),
            trim($data["city"]),
            trim($data["state"]),
            (int)$data["capacity"],
            $data["facilities"] ?? ""
        ]);

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Venue created successfully",
            "venue_id" => (int)$pdo->lastInsertId()
        ]);
        exit;
    }

    // PUT - Update venue
    if ($method === "PUT") {
        authenticate(["admin", "organiser"]);

        $id = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);
        $data = json_decode(
            file_get_contents("php://input"), true
        );

        if (!$id || !is_array($data) ||
            !isset($data["venue_name"], $data["capacity"]) ||
            !is_string($data["venue_name"]) ||
            trim($data["venue_name"]) === "" ||
            filter_var($data["capacity"], FILTER_VALIDATE_INT) === false ||
            (int)$data["capacity"] <= 0) {
            venueResponse(422, false, "Invalid venue update");
        }

        $stmt = $pdo->prepare(
            "UPDATE venues
             SET venue_name = ?, capacity = ?
             WHERE venue_id = ?"
        );

        $stmt->execute([
            trim($data["venue_name"]),
            (int)$data["capacity"],
            $id
        ]);

        $check = $pdo->prepare(
            "SELECT venue_id FROM venues WHERE venue_id = ?"
        );
        $check->execute([$id]);

        if (!$check->fetch()) {
            venueResponse(404, false, "Venue not found");
        }

        echo json_encode([
            "success" => true,
            "message" => "Venue updated successfully",
            "venue_id" => $id
        ]);
        exit;
    }

    // DELETE - Delete venue
    if ($method === "DELETE") {
        authenticate(["admin"]);

        $id = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

        if (!$id || $id <= 0) {
            venueResponse(400, false, "Valid venue ID required");
        }

        $check = $pdo->prepare(
            "SELECT venue_id FROM venues WHERE venue_id = ?"
        );
        $check->execute([$id]);

        if (!$check->fetch()) {
            venueResponse(404, false, "Venue not found");
        }

        $linked = $pdo->prepare(
            "SELECT COUNT(*) FROM events WHERE venue_id = ?"
        );
        $linked->execute([$id]);

        if ((int)$linked->fetchColumn() > 0) {
            venueResponse(
                409, false,
                "Cannot delete venue with existing events"
            );
        }

        $stmt = $pdo->prepare(
            "DELETE FROM venues WHERE venue_id = ?"
        );
        $stmt->execute([$id]);

        echo json_encode([
            "success" => true,
            "message" => "Venue deleted successfully"
        ]);
        exit;
    }

    header("Allow: GET, POST, PUT, DELETE");
    venueResponse(405, false, "Method not allowed");

} catch (PDOException $e) {
    error_log($e->getMessage());
    venueResponse(500, false, "Database operation failed");
}
