
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth.php";

$method = $_SERVER["REQUEST_METHOD"];

try {
    if ($method === "GET") {
        $stmt = $pdo->query(
            "SELECT * FROM events ORDER BY event_id ASC"
        );

        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "total_events" => count($events),
            "data" => $events
        ]);
        exit;
    }

    if ($method === "POST") {
        $user = authenticate(["admin", "organiser"]);

        $data = json_decode(
            file_get_contents("php://input"),
            true
        );

        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Valid JSON body is required"
            ]);
            exit;
        }

        $required = [
            "venue_id", "event_name", "category",
            "start_date", "end_date", "ticket_price"
        ];

        foreach ($required as $field) {
            if (!isset($data[$field]) ||
                !is_scalar($data[$field]) ||
                trim((string)$data[$field]) === "") {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Missing or invalid field: $field"
                ]);
                exit;
            }
        }

        $start = DateTimeImmutable::createFromFormat(
            "!Y-m-d H:i:s", $data["start_date"]
        );
        $end = DateTimeImmutable::createFromFormat(
            "!Y-m-d H:i:s", $data["end_date"]
        );

        if (!$start || !$end || $end <= $start ||
            !filter_var($data["venue_id"], FILTER_VALIDATE_INT) ||
            (int)$data["venue_id"] <= 0 ||
            !is_numeric($data["ticket_price"]) ||
            (float)$data["ticket_price"] < 0) {
            http_response_code(422);
            echo json_encode([
                "success" => false,
                "message" => "Invalid event dates, venue or price"
            ]);
            exit;
        }

        $venue = $pdo->prepare(
            "SELECT venue_id FROM venues
             WHERE venue_id = ? AND status = 'available'"
        );
        $venue->execute([(int)$data["venue_id"]]);

        if (!$venue->fetch()) {
            http_response_code(422);
            echo json_encode([
                "success" => false,
                "message" => "Venue not available"
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO events
             (organiser_id, venue_id, event_name,
              description, category, start_date,
              end_date, ticket_price, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')"
        );

        $stmt->execute([
            $user["user_id"],
            (int)$data["venue_id"],
            trim($data["event_name"]),
            $data["description"] ?? "",
            trim($data["category"]),
            $data["start_date"],
            $data["end_date"],
            $data["ticket_price"]
        ]);

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Event created successfully",
            "event_id" => (int)$pdo->lastInsertId()
        ]);
        exit;
    }
    
    // UPDATE EVENT
    if ($method === "PUT") {
        $user = authenticate(["admin", "organiser"]);

        $id = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

        if (!$id || $id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Valid event ID is required"
            ]);
            exit;
        }

        $data = json_decode(
            file_get_contents("php://input"),
            true
        );

        if (!is_array($data) ||
            !isset($data["event_name"], $data["ticket_price"]) ||
            !is_string($data["event_name"]) ||
            trim($data["event_name"]) === "" ||
            !is_numeric($data["ticket_price"]) ||
            (float)$data["ticket_price"] < 0) {
            http_response_code(422);
            echo json_encode([
                "success" => false,
                "message" => "Valid event name and price are required"
            ]);
            exit;
        }

        $check = $pdo->prepare(
            "SELECT organiser_id FROM events WHERE event_id = ?"
        );
        $check->execute([$id]);
        $existing = $check->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "Event not found"
            ]);
            exit;
        }

        if ($user["role"] !== "admin" &&
            (int)$existing["organiser_id"] !== $user["user_id"]) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Cannot edit another organiser's event"
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            "UPDATE events
             SET event_name = ?, ticket_price = ?
             WHERE event_id = ?"
        );

        $stmt->execute([
            trim($data["event_name"]),
            $data["ticket_price"],
            $id
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Event updated successfully",
            "event_id" => $id
        ]);
        exit;
    }

    // DELETE EVENT
    if ($method === "DELETE") {
        $user = authenticate(["admin", "organiser"]);

        $id = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

        if (!$id || $id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Valid event ID is required"
            ]);
            exit;
        }

        $check = $pdo->prepare(
            "SELECT organiser_id FROM events WHERE event_id = ?"
        );
        $check->execute([$id]);
        $existing = $check->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "Event not found"
            ]);
            exit;
        }

        if ($user["role"] !== "admin" &&
            (int)$existing["organiser_id"] !== $user["user_id"]) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Cannot delete another organiser's event"
            ]);
            exit;
        }

        // Do not delete events with schedules or bookings.
        $stmt = $pdo->prepare(
            "DELETE FROM events WHERE event_id = ?"
        );
        $stmt->execute([$id]);

        echo json_encode([
            "success" => true,
            "message" => "Event deleted successfully"
        ]);
        exit;
    }

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed"
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database operation failed"
    ]);
}
