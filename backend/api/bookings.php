
<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth.php";

$method = $_SERVER["REQUEST_METHOD"];

function bookingResponse($code, $success, $message) {
    http_response_code($code);
    echo json_encode([
        "success" => $success,
        "message" => $message
    ]);
    exit;
}

try {
    // GET - View bookings
    if ($method === "GET") {
        $user = authenticate(["admin", "organiser", "customer"]);

        $sql = "SELECT b.booking_id, b.booking_reference,
                       b.user_id, u.full_name AS customer_name,
                       e.event_name, s.schedule_date,
                       b.quantity, b.total_amount,
                       b.booking_status, b.booked_at
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN event_schedules s
                  ON b.schedule_id = s.schedule_id
                JOIN events e ON s.event_id = e.event_id";

        if ($user["role"] === "customer") {
            $sql .= " WHERE b.user_id = ?";
            $stmt = $pdo->prepare(
                $sql . " ORDER BY b.booking_id DESC"
            );
            $stmt->execute([$user["user_id"]]);
        } elseif ($user["role"] === "organiser") {
            $sql .= " WHERE e.organiser_id = ?";
            $stmt = $pdo->prepare(
                $sql . " ORDER BY b.booking_id DESC"
            );
            $stmt->execute([$user["user_id"]]);
        } else {
            $stmt = $pdo->query(
                $sql . " ORDER BY b.booking_id DESC"
            );
        }

        $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "total_bookings" => count($bookings),
            "data" => $bookings
        ]);
        exit;
    }

    // POST - Customer books tickets
    if ($method === "POST") {
        $user = authenticate(["customer"]);

        $data = json_decode(
            file_get_contents("php://input"), true
        );

        if (!is_array($data) ||
            !isset($data["schedule_id"], $data["quantity"]) ||
            filter_var($data["schedule_id"],
                FILTER_VALIDATE_INT) === false ||
            filter_var($data["quantity"],
                FILTER_VALIDATE_INT) === false ||
            (int)$data["schedule_id"] <= 0 ||
            (int)$data["quantity"] <= 0) {
            bookingResponse(
                422, false,
                "Valid schedule ID and quantity required"
            );
        }

        $scheduleId = (int)$data["schedule_id"];
        $quantity = (int)$data["quantity"];

        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            "SELECT s.available_tickets, s.status,
                    s.schedule_date, e.ticket_price,
                    e.status AS event_status,
                    e.start_date
             FROM event_schedules s
             JOIN events e ON s.event_id = e.event_id
             WHERE s.schedule_id = ?
             FOR UPDATE"
        );
        $stmt->execute([$scheduleId]);
        $schedule = $stmt->fetch();

        if (!$schedule) {
            $pdo->rollBack();
            bookingResponse(404, false, "Schedule not found");
        }

        if ($schedule["status"] !== "open" ||
            $schedule["event_status"] !== "upcoming" ||
            strtotime($schedule["start_date"]) <= time()) {
            $pdo->rollBack();
            bookingResponse(409, false, "Booking is closed");
        }

        if ($quantity > (int)$schedule["available_tickets"]) {
            $pdo->rollBack();
            bookingResponse(
                409, false,
                "Not enough tickets available"
            );
        }

        $total = round(
            $quantity * (float)$schedule["ticket_price"], 2
        );

        $reference = "BK" .
            strtoupper(bin2hex(random_bytes(6)));

        $stmt = $pdo->prepare(
            "INSERT INTO bookings
             (user_id, schedule_id, quantity, total_amount,
              booking_status, booking_reference)
             VALUES (?, ?, ?, ?, 'confirmed', ?)"
        );

        $stmt->execute([
            $user["user_id"],
            $scheduleId,
            $quantity,
            $total,
            $reference
        ]);

        $bookingId = (int)$pdo->lastInsertId();

        $stmt = $pdo->prepare(
            "UPDATE event_schedules
             SET available_tickets =
                 available_tickets - ?
             WHERE schedule_id = ?"
        );
        $stmt->execute([$quantity, $scheduleId]);

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Booking created successfully",
            "booking_id" => $bookingId,
            "booking_reference" => $reference,
            "total_amount" => $total
        ]);
        exit;
    }

    // PATCH - Cancel booking
    if ($method === "PATCH") {
        $user = authenticate(["admin", "customer"]);

        $id = filter_input(
            INPUT_GET, "id", FILTER_VALIDATE_INT
        );

        if (!$id || $id <= 0) {
            bookingResponse(400, false, "Valid booking ID required");
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            "SELECT booking_id, user_id, schedule_id,
                    quantity, booking_status
             FROM bookings
             WHERE booking_id = ?
             FOR UPDATE"
        );

        $stmt->execute([$id]);
        $booking = $stmt->fetch();

        if (!$booking) {
            $pdo->rollBack();
            bookingResponse(404, false, "Booking not found");
        }

        if ($user["role"] !== "admin" &&
            (int)$booking["user_id"] !== $user["user_id"]) {
            $pdo->rollBack();
            bookingResponse(403, false, "Access denied");
        }

        if ($booking["booking_status"] === "cancelled") {
            $pdo->rollBack();
            bookingResponse(
                409, false,
                "Booking already cancelled"
            );
        }

        $stmt = $pdo->prepare(
            "UPDATE event_schedules
             SET available_tickets =
                 available_tickets + ?
             WHERE schedule_id = ?"
        );

        $stmt->execute([
            $booking["quantity"],
            $booking["schedule_id"]
        ]);

        $stmt = $pdo->prepare(
            "UPDATE bookings
             SET booking_status = 'cancelled'
             WHERE booking_id = ?"
        );

        $stmt->execute([$id]);

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" => "Booking cancelled successfully"
        ]);
        exit;
    }

    header("Allow: GET, POST, PATCH");
    bookingResponse(405, false, "Method not allowed");

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($e->getMessage());
    bookingResponse(500, false, "Booking operation failed");
}
