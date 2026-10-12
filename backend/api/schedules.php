
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/database.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    header("Allow: GET");
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed"
    ]);
    exit;
}

try {
    $eventId = filter_input(
        INPUT_GET, "event_id", FILTER_VALIDATE_INT
    );

    if (isset($_GET["event_id"]) &&
        (!$eventId || $eventId <= 0)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid event ID"
        ]);
        exit;
    }

    $sql = "
        SELECT
            s.schedule_id,
            s.event_id,
            e.event_name,
            s.schedule_date,
            s.start_time,
            s.end_time,
            s.total_tickets,
            s.available_tickets,
            s.status,
            e.ticket_price
        FROM event_schedules s
        INNER JOIN events e
            ON s.event_id = e.event_id
        WHERE e.status = 'upcoming'
          AND e.start_date > NOW()
          AND s.status = 'open'
    ";

    $params = [];

    if ($eventId) {
        $sql .= " AND s.event_id = ?";
        $params[] = $eventId;
    }

    $sql .= "
        ORDER BY s.schedule_date ASC, s.start_time ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "total_schedules" => count($schedules),
        "data" => $schedules
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to retrieve schedules"
    ]);
}
