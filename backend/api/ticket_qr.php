
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

$user = authenticate(["admin", "organiser", "customer"]);

$id = filter_input(INPUT_GET, "booking_id", FILTER_VALIDATE_INT);

if (!$id || $id <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Valid booking ID required"
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT b.booking_id, b.booking_reference,
                b.user_id, b.booking_status,
                e.organiser_id, e.event_name
         FROM bookings b
         JOIN event_schedules s
           ON b.schedule_id = s.schedule_id
         JOIN events e ON s.event_id = e.event_id
         WHERE b.booking_id = ?"
    );
    $stmt->execute([$id]);
    $booking = $stmt->fetch();

    if (!$booking) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Booking not found"
        ]);
        exit;
    }

    // Only owner, event organiser, or admin can access.
    if ($user["role"] === "customer" &&
        (int)$booking["user_id"] !== $user["user_id"]) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "Access denied"
        ]);
        exit;
    }

    if ($user["role"] === "organiser" &&
        (int)$booking["organiser_id"] !== $user["user_id"]) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "Access denied"
        ]);
        exit;
    }

    if ($booking["booking_status"] !== "confirmed") {
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "message" => "QR unavailable for unconfirmed booking"
        ]);
        exit;
    }

    // Use an opaque reference rather than personal details.
    $qrData = "Booking: " . $booking["booking_reference"];

    $url = "https://api.qrserver.com/v1/create-qr-code/?" .
        http_build_query([
            "size" => "250x250",
            "data" => $qrData,
            "format" => "png"
        ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $image = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($image === false ||
        $httpCode !== 200 ||
        stripos((string)$contentType, "image/png") === false ||
        strlen($image) < 50) {
        http_response_code(502);
        echo json_encode([
            "success" => false,
            "message" => "External QR code service unavailable"
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Ticket QR generated successfully",
        "booking_id" => $booking["booking_id"],
        "booking_reference" => $booking["booking_reference"],
        "event_name" => $booking["event_name"],
        "qr_image" => "data:image/png;base64," .
            base64_encode($image)
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to generate ticket QR"
    ]);
}
