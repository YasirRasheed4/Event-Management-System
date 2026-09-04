<?php
// ============================================================
//  EVENT MANAGEMENT SYSTEM — PHP BACKEND (api.php)
//  Place this file at your web root. All AJAX calls hit this.
//  Requirements: PHP 8.0+, MySQL 8.0+, PDO extension enabled
// ============================================================

// ---------- CONFIGURATION ----------
define('DB_HOST', getenv('EMS_DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('EMS_DB_NAME') ?: 'eventsphere');
define('DB_USER', getenv('EMS_DB_USER') ?: '');
define('DB_PASS', getenv('EMS_DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// ---------- CORS & HEADERS ----------
header('Content-Type: application/json');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ---------- PDO CONNECTION ----------
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            jsonResponse(false, 'Database connection failed: ' . $e->getMessage(), null, 500);
            exit;
        }
    }
    return $pdo;
}

// ---------- HELPERS ----------
function jsonResponse(bool $success, string $message, $data = null, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

function getInput(): array {
    $body = file_get_contents('php://input');
    $json = json_decode($body, true);
    return $json ?? array_merge($_GET, $_POST);
}

function sanitize(string $value): string {
    return htmlspecialchars(strip_tags(trim($value)));
}

function generateRef(): string {
    return 'EMS-' . date('Y') . '-' . strtoupper(substr(uniqid(), -6));
}

function createSlug(string $title): string {
    return strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', trim($title)));
}

// ---------- SIMPLE SESSION AUTH ----------
$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'httponly' => true,
    'secure' => $isHttps,
    'samesite' => $isHttps ? 'None' : 'Lax',
]);
session_start();

function requireAuth(): array {
    if (empty($_SESSION['user_id'])) {
        jsonResponse(false, 'Unauthorized. Please login.', null, 401);
    }
    return $_SESSION;
}

function requireAdmin(): void {
    $sess = requireAuth();
    if ($sess['role_id'] != 1) {
        jsonResponse(false, 'Admin access required.', null, 403);
    }
}

// ---------- ROUTER ----------
$method   = $_SERVER['REQUEST_METHOD'];
$resource = $_GET['resource'] ?? '';
$id       = isset($_GET['id']) ? (int)$_GET['id'] : null;

match (true) {
    // AUTH
    $resource === 'login'     && $method === 'POST' => handleLogin(),
    $resource === 'logout'    && $method === 'POST' => handleLogout(),
    $resource === 'register'  && $method === 'POST' => handleRegister(),

    // DASHBOARD
    $resource === 'dashboard' && $method === 'GET'  => getDashboard(),

    // EVENTS CRUD
    $resource === 'events'    && $method === 'GET'  && !$id => getEvents(),
    $resource === 'events'    && $method === 'GET'  && $id  => getEvent($id),
    $resource === 'events'    && $method === 'POST'         => createEvent(),
    $resource === 'events'    && $method === 'PUT'  && $id  => updateEvent($id),
    $resource === 'events'    && $method === 'DELETE'&& $id => deleteEvent($id),

    // VENUES CRUD
    $resource === 'venues'    && $method === 'GET'          => getVenues(),
    $resource === 'venues'    && $method === 'POST'         => createVenue(),
    $resource === 'venues'    && $method === 'PUT'  && $id  => updateVenue($id),
    $resource === 'venues'    && $method === 'DELETE'&& $id => deleteVenue($id),

    // USERS / PARTICIPANTS
    $resource === 'users'     && $method === 'GET'          => getUsers(),
    $resource === 'users'     && $method === 'PUT'  && $id  => updateUser($id),
    $resource === 'users'     && $method === 'DELETE'&& $id => deleteUser($id),

    // BOOKINGS
    $resource === 'bookings'  && $method === 'GET'          => getBookings(),
    $resource === 'bookings'  && $method === 'POST'         => createBooking(),
    $resource === 'bookings'  && $method === 'PUT'  && $id  => updateBooking($id),

    // PAYMENTS
    $resource === 'payments'  && $method === 'GET'          => getPayments(),
    $resource === 'payments'  && $method === 'POST'         => createPayment(),

    // CATEGORIES
    $resource === 'categories'&& $method === 'GET'          => getCategories(),

    // REPORTS
    $resource === 'reports'   && $method === 'GET'          => getReports(),

    // SEARCH
    $resource === 'search'    && $method === 'GET'          => searchEvents(),

    // FEEDBACK
    $resource === 'feedback'  && $method === 'POST'         => submitFeedback(),

    default => jsonResponse(false, "Route not found: [$method] $resource", null, 404)
};

// ============================================================
//  AUTH HANDLERS
// ============================================================

function handleLogin(): void {
    $data  = getInput();
    $email = sanitize($data['email'] ?? '');
    $pass  = $data['password'] ?? '';

    if (!$email || !$pass) {
        jsonResponse(false, 'Email and password required.', null, 422);
    }

    $db   = getDB();
    $stmt = $db->prepare("SELECT user_id, role_id, full_name, email, password_hash, is_active FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $valid = $user && password_verify($pass, $user['password_hash']);

    if (!$valid || !$user['is_active']) {
        jsonResponse(false, 'Invalid credentials or account inactive.', null, 401);
    }

    $_SESSION['user_id']   = $user['user_id'];
    $_SESSION['role_id']   = $user['role_id'];
    $_SESSION['full_name'] = $user['full_name'];

    unset($user['password_hash']);
    jsonResponse(true, 'Login successful.', $user);
}

function handleLogout(): void {
    session_destroy();
    jsonResponse(true, 'Logged out successfully.');
}

function handleRegister(): void {
    $data  = getInput();
    $name  = sanitize($data['full_name'] ?? '');
    $email = sanitize($data['email']     ?? '');
    $phone = sanitize($data['phone']     ?? '');
    $pass  = $data['password'] ?? '';

    if (!$name || !$email || !$pass) {
        jsonResponse(false, 'Name, email, and password are required.', null, 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Invalid email address.', null, 422);
    }
    if (strlen($pass) < 6) {
        jsonResponse(false, 'Password must be at least 6 characters.', null, 422);
    }

    $db   = getDB();
    $hash = password_hash($pass, PASSWORD_BCRYPT);

    try {
        $stmt = $db->prepare("INSERT INTO users (role_id, full_name, email, phone, password_hash) VALUES (3, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $phone, $hash]);
        $newId = $db->lastInsertId();
        jsonResponse(true, 'Registration successful.', ['user_id' => $newId]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(false, 'Email already registered.', null, 409);
        }
        jsonResponse(false, 'Registration failed.', null, 500);
    }
}

// ============================================================
//  DASHBOARD
// ============================================================

function getDashboard(): void {
    requireAuth();
    $db = getDB();

    $stats = [];

    // Total events
    $stats['total_events']      = $db->query("SELECT COUNT(*) FROM events")->fetchColumn();
    $stats['published_events']  = $db->query("SELECT COUNT(*) FROM events WHERE status='published'")->fetchColumn();

    // Total users / participants
    $stats['total_users']       = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $stats['total_participants']= $db->query("SELECT COUNT(*) FROM users WHERE role_id=3")->fetchColumn();

    // Bookings
    $stats['total_bookings']    = $db->query("SELECT COUNT(*) FROM bookings")->fetchColumn();
    $stats['confirmed_bookings']= $db->query("SELECT COUNT(*) FROM bookings WHERE status='confirmed'")->fetchColumn();

    // Revenue
    $stats['total_revenue']     = $db->query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='completed'")->fetchColumn();
    $stats['monthly_revenue']   = $db->query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='completed' AND MONTH(paid_at)=MONTH(NOW())")->fetchColumn();

    // Upcoming events (next 30 days)
    $upcoming = $db->query("
        SELECT e.event_id, e.title, e.event_date, e.available_seats, e.ticket_price, c.name AS category, v.name AS venue
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        JOIN venues     v ON e.venue_id     = v.venue_id
        WHERE e.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          AND e.status = 'published'
        ORDER BY e.event_date ASC
        LIMIT 5
    ")->fetchAll();

    // Recent bookings
    $recent_bookings = $db->query("
        SELECT b.booking_ref, u.full_name, e.title, b.total_amount, b.status, b.booked_at
        FROM bookings b
        JOIN users  u ON b.user_id  = u.user_id
        JOIN events e ON b.event_id = e.event_id
        ORDER BY b.booked_at DESC
        LIMIT 6
    ")->fetchAll();

    // Revenue by month (last 6 months)
    $revenue_chart = $db->query("
        SELECT DATE_FORMAT(paid_at,'%b %Y') AS month, SUM(amount) AS revenue
        FROM payments
        WHERE status='completed' AND paid_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(paid_at,'%Y-%m')
        ORDER BY paid_at ASC
    ")->fetchAll();

    // Category breakdown
    $category_chart = $db->query("
        SELECT c.name, COUNT(e.event_id) AS count
        FROM categories c
        LEFT JOIN events e ON c.category_id = e.category_id
        GROUP BY c.category_id
        ORDER BY count DESC
    ")->fetchAll();

    jsonResponse(true, 'Dashboard data loaded.', compact('stats','upcoming','recent_bookings','revenue_chart','category_chart'));
}

// ============================================================
//  EVENTS CRUD
// ============================================================

function getEvents(): void {
    $db = getDB();

    // Filters from query string
    $where    = ["1=1"];
    $params   = [];
    $category = $_GET['category'] ?? '';
    $status   = $_GET['status']   ?? 'published';
    $from     = $_GET['from']     ?? '';
    $to       = $_GET['to']       ?? '';
    $limit    = min((int)($_GET['limit'] ?? 20), 100);
    $offset   = (int)($_GET['offset'] ?? 0);

    if ($category) { $where[] = "c.name = ?";      $params[] = $category; }
    if ($status)   { $where[] = "e.status = ?";    $params[] = $status; }
    if ($from)     { $where[] = "e.event_date >= ?";$params[] = $from; }
    if ($to)       { $where[] = "e.event_date <= ?";$params[] = $to; }

    $sql = "
        SELECT e.*, c.name AS category, c.color_hex, v.name AS venue, v.city,
               u.full_name AS organizer,
               (e.total_seats - e.available_seats) AS seats_sold
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        JOIN venues     v ON e.venue_id     = v.venue_id
        JOIN users      u ON e.organizer_id = u.user_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY e.event_date ASC
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll();

    // Total count for pagination
    $countSql = "SELECT COUNT(*) FROM events e JOIN categories c ON e.category_id=c.category_id JOIN venues v ON e.venue_id=v.venue_id WHERE " . implode(' AND ', $where);
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    jsonResponse(true, 'Events fetched.', ['events' => $events, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

function getEvent(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare("
        SELECT e.*, c.name AS category, c.color_hex, v.name AS venue, v.address, v.city, v.capacity, v.facilities,
               u.full_name AS organizer, u.email AS organizer_email,
               (SELECT AVG(rating) FROM event_feedback WHERE event_id = e.event_id) AS avg_rating,
               (SELECT COUNT(*)   FROM event_feedback WHERE event_id = e.event_id) AS review_count
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        JOIN venues     v ON e.venue_id     = v.venue_id
        JOIN users      u ON e.organizer_id = u.user_id
        WHERE e.event_id = ?
    ");
    $stmt->execute([$id]);
    $event = $stmt->fetch();

    if (!$event) { jsonResponse(false, 'Event not found.', null, 404); }

    // Ticket types
    $ttStmt = $db->prepare("SELECT * FROM ticket_types WHERE event_id = ?");
    $ttStmt->execute([$id]);
    $event['ticket_types'] = $ttStmt->fetchAll();

    // Reviews
    $revStmt = $db->prepare("
        SELECT f.rating, f.comment, f.submitted_at, u.full_name
        FROM event_feedback f
        JOIN users u ON f.user_id = u.user_id
        WHERE f.event_id = ?
        ORDER BY f.submitted_at DESC
        LIMIT 10
    ");
    $revStmt->execute([$id]);
    $event['reviews'] = $revStmt->fetchAll();

    jsonResponse(true, 'Event details fetched.', $event);
}

function createEvent(): void {
    requireAuth();
    $data = getInput();

    $required = ['title','category_id','venue_id','event_date','start_time','end_time','total_seats','ticket_price'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(false, "Field '$field' is required.", null, 422);
        }
    }

    $db   = getDB();
    $slug = createSlug($data['title']);

    // Make slug unique
    $slugCheck = $db->prepare("SELECT COUNT(*) FROM events WHERE slug = ?");
    $slugCheck->execute([$slug]);
    if ($slugCheck->fetchColumn() > 0) { $slug .= '-' . time(); }

    $stmt = $db->prepare("
        INSERT INTO events (organizer_id, category_id, venue_id, title, slug, description, event_date, start_time, end_time, total_seats, available_seats, ticket_price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $_SESSION['user_id'],
        (int)$data['category_id'],
        (int)$data['venue_id'],
        sanitize($data['title']),
        $slug,
        sanitize($data['description'] ?? ''),
        $data['event_date'],
        $data['start_time'],
        $data['end_time'],
        (int)$data['total_seats'],
        (int)$data['total_seats'],            // available = total initially
        (float)$data['ticket_price'],
        sanitize($data['status'] ?? 'draft'),
    ]);

    $newId = $db->lastInsertId();
    jsonResponse(true, 'Event created successfully.', ['event_id' => $newId, 'slug' => $slug], 201);
}

function updateEvent(int $id): void {
    requireAuth();
    $data = getInput();
    $db   = getDB();

    // Only admin or the organizer can update
    $owner = $db->prepare("SELECT organizer_id FROM events WHERE event_id = ?");
    $owner->execute([$id]);
    $row = $owner->fetch();
    if (!$row) { jsonResponse(false, 'Event not found.', null, 404); }
    if ($_SESSION['role_id'] != 1 && $row['organizer_id'] != $_SESSION['user_id']) {
        jsonResponse(false, 'Permission denied.', null, 403);
    }

    $fields  = [];
    $params  = [];
    $allowed = ['title','description','event_date','start_time','end_time','total_seats','available_seats','ticket_price','status','category_id','venue_id'];

    foreach ($allowed as $f) {
        if (isset($data[$f])) {
            $fields[] = "$f = ?";
            $params[]  = is_string($data[$f]) ? sanitize($data[$f]) : $data[$f];
        }
    }

    if (empty($fields)) { jsonResponse(false, 'No fields to update.', null, 422); }

    $params[] = $id;
    $db->prepare("UPDATE events SET " . implode(', ', $fields) . " WHERE event_id = ?")->execute($params);

    jsonResponse(true, 'Event updated successfully.');
}

function deleteEvent(int $id): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->prepare("DELETE FROM events WHERE event_id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) { jsonResponse(false, 'Event not found.', null, 404); }
    jsonResponse(true, 'Event deleted.');
}

// ============================================================
//  VENUES CRUD
// ============================================================

function getVenues(): void {
    $db = getDB();
    $venues = $db->query("SELECT * FROM venues WHERE is_active = 1 ORDER BY name")->fetchAll();
    jsonResponse(true, 'Venues fetched.', $venues);
}

function createVenue(): void {
    requireAuth();
    $data = getInput();
    $db   = getDB();

    $stmt = $db->prepare("INSERT INTO venues (name, address, city, country, capacity, contact_info, facilities) VALUES (?,?,?,?,?,?,?)");
    $stmt->execute([
        sanitize($data['name']         ?? ''),
        sanitize($data['address']      ?? ''),
        sanitize($data['city']         ?? ''),
        sanitize($data['country']      ?? 'Pakistan'),
        (int)($data['capacity']        ?? 100),
        sanitize($data['contact_info'] ?? ''),
        sanitize($data['facilities']   ?? ''),
    ]);
    jsonResponse(true, 'Venue created.', ['venue_id' => $db->lastInsertId()], 201);
}

function updateVenue(int $id): void {
    requireAuth();
    $data    = getInput();
    $db      = getDB();
    $fields  = []; $params = [];
    $allowed = ['name','address','city','country','capacity','contact_info','facilities','is_active'];

    foreach ($allowed as $f) {
        if (isset($data[$f])) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
    }
    if (empty($fields)) { jsonResponse(false, 'Nothing to update.'); }
    $params[] = $id;
    $db->prepare("UPDATE venues SET " . implode(', ', $fields) . " WHERE venue_id = ?")->execute($params);
    jsonResponse(true, 'Venue updated.');
}

function deleteVenue(int $id): void {
    requireAdmin();
    $db = getDB();
    $db->prepare("UPDATE venues SET is_active = 0 WHERE venue_id = ?")->execute([$id]);
    jsonResponse(true, 'Venue deactivated.');
}

// ============================================================
//  USERS
// ============================================================

function getUsers(): void {
    requireAdmin();
    $db = getDB();
    $users = $db->query("
        SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.is_active, u.created_at,
               COUNT(b.booking_id) AS total_bookings
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN bookings b ON u.user_id = b.user_id
        GROUP BY u.user_id
        ORDER BY u.created_at DESC
    ")->fetchAll();
    jsonResponse(true, 'Users fetched.', $users);
}

function updateUser(int $id): void {
    requireAdmin();
    $data    = getInput();
    $db      = getDB();
    $fields  = []; $params = [];
    $allowed = ['full_name','email','phone','role_id','is_active'];

    foreach ($allowed as $f) {
        if (isset($data[$f])) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
    }
    $params[] = $id;
    $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE user_id = ?")->execute($params);
    jsonResponse(true, 'User updated.');
}

function deleteUser(int $id): void {
    requireAdmin();
    $db = getDB();
    $db->prepare("UPDATE users SET is_active = 0 WHERE user_id = ?")->execute([$id]);
    jsonResponse(true, 'User deactivated.');
}

// ============================================================
//  BOOKINGS
// ============================================================

function getBookings(): void {
    requireAuth();
    $db   = getDB();
    $sess = $_SESSION;
    $where= "1=1"; $params = [];

    if ($sess['role_id'] == 3) {   // participants see only their own
        $where    = "b.user_id = ?";
        $params[] = $sess['user_id'];
    }

    $stmt = $db->prepare("
        SELECT b.*, u.full_name, u.email, e.title AS event_title, e.event_date,
               tt.type_name AS ticket_type, v.name AS venue
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN events e ON b.event_id = e.event_id
        JOIN venues v ON e.venue_id = v.venue_id
        LEFT JOIN ticket_types tt ON b.ticket_type_id = tt.ticket_type_id
        WHERE $where
        ORDER BY b.booked_at DESC
    ");
    $stmt->execute($params);
    jsonResponse(true, 'Bookings fetched.', $stmt->fetchAll());
}

function createBooking(): void {
    $sess     = requireAuth();
    $data     = getInput();
    $db       = getDB();

    $eventId  = (int)($data['event_id']       ?? 0);
    $ttId     = isset($data['ticket_type_id']) ? (int)$data['ticket_type_id'] : null;
    $numTix   = max(1, (int)($data['num_tickets'] ?? 1));

    if (!$eventId) { jsonResponse(false, 'event_id required.', null, 422); }

    // Check event & seats
    $event = $db->prepare("SELECT * FROM events WHERE event_id = ? AND status = 'published' FOR UPDATE");
    // Use transaction
    $db->beginTransaction();
    try {
        $eStmt = $db->prepare("SELECT event_id, available_seats, ticket_price FROM events WHERE event_id = ? AND status='published' FOR UPDATE");
        $eStmt->execute([$eventId]);
        $event = $eStmt->fetch();

        if (!$event) { throw new Exception('Event not found or not available.'); }
        if ($event['available_seats'] < $numTix) { throw new Exception('Not enough seats available.'); }

        $price = $event['ticket_price'];
        if ($ttId) {
            $ttStmt = $db->prepare("SELECT price FROM ticket_types WHERE ticket_type_id = ? AND event_id = ?");
            $ttStmt->execute([$ttId, $eventId]);
            $tt = $ttStmt->fetch();
            if ($tt) $price = $tt['price'];
        }

        $total = $price * $numTix;
        $ref   = generateRef();

        $db->prepare("INSERT INTO bookings (user_id, event_id, ticket_type_id, booking_ref, num_tickets, total_amount) VALUES (?,?,?,?,?,?)")
           ->execute([$sess['user_id'], $eventId, $ttId, $ref, $numTix, $total]);
        $bookingId = $db->lastInsertId();

        $db->prepare("UPDATE events SET available_seats = available_seats - ? WHERE event_id = ?")
           ->execute([$numTix, $eventId]);

        $db->commit();
        jsonResponse(true, 'Booking created.', ['booking_id' => $bookingId, 'booking_ref' => $ref, 'total_amount' => $total], 201);

    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(false, $e->getMessage(), null, 400);
    }
}

function updateBooking(int $id): void {
    requireAuth();
    $data   = getInput();
    $db     = getDB();
    $status = sanitize($data['status'] ?? '');

    $allowed = ['pending','confirmed','cancelled','attended'];
    if (!in_array($status, $allowed)) { jsonResponse(false, 'Invalid status.', null, 422); }

    $db->prepare("UPDATE bookings SET status = ? WHERE booking_id = ?")->execute([$status, $id]);
    jsonResponse(true, 'Booking updated.');
}

// ============================================================
//  PAYMENTS
// ============================================================

function getPayments(): void {
    requireAdmin();
    $db = getDB();
    $payments = $db->query("
        SELECT p.*, b.booking_ref, b.num_tickets, u.full_name, e.title AS event_title
        FROM payments p
        JOIN bookings b ON p.booking_id = b.booking_id
        JOIN users    u ON b.user_id    = u.user_id
        JOIN events   e ON b.event_id   = e.event_id
        ORDER BY p.created_at DESC
    ")->fetchAll();
    jsonResponse(true, 'Payments fetched.', $payments);
}

function createPayment(): void {
    requireAuth();
    $data = getInput();
    $db   = getDB();

    $bookingId = (int)($data['booking_id'] ?? 0);
    $method    = sanitize($data['method'] ?? 'cash');

    if (!$bookingId) { jsonResponse(false, 'booking_id required.', null, 422); }

    $bStmt = $db->prepare("SELECT * FROM bookings WHERE booking_id = ?");
    $bStmt->execute([$bookingId]);
    $booking = $bStmt->fetch();
    if (!$booking) { jsonResponse(false, 'Booking not found.', null, 404); }

    $ref = 'TXN-' . strtoupper(uniqid());

    $db->prepare("INSERT INTO payments (booking_id, amount, method, status, transaction_ref, paid_at) VALUES (?,?,?,'completed',?,NOW())")
       ->execute([$bookingId, $booking['total_amount'], $method, $ref]);

    $db->prepare("UPDATE bookings SET status='confirmed' WHERE booking_id=?")->execute([$bookingId]);

    jsonResponse(true, 'Payment recorded.', ['transaction_ref' => $ref, 'amount' => $booking['total_amount']], 201);
}

// ============================================================
//  CATEGORIES
// ============================================================

function getCategories(): void {
    $categories = getDB()->query("SELECT * FROM categories ORDER BY name")->fetchAll();
    jsonResponse(true, 'Categories fetched.', $categories);
}

// ============================================================
//  SEARCH
// ============================================================

function searchEvents(): void {
    $q        = sanitize($_GET['q'] ?? '');
    $category = sanitize($_GET['category'] ?? '');
    $city     = sanitize($_GET['city']     ?? '');
    $minPrice = (float)($_GET['min_price'] ?? 0);
    $maxPrice = (float)($_GET['max_price'] ?? 999999);

    if (!$q && !$category && !$city) {
        jsonResponse(false, 'Provide at least one search parameter.', null, 422);
    }

    $where  = ["e.status = 'published'", "e.event_date >= CURDATE()"];
    $params = [];

    if ($q) {
        $where[]  = "(e.title LIKE ? OR e.description LIKE ?)";
        $params[] = "%$q%"; $params[] = "%$q%";
    }
    if ($category) { $where[] = "c.name = ?";    $params[] = $category; }
    if ($city)     { $where[] = "v.city LIKE ?"; $params[] = "%$city%"; }
    $where[] = "e.ticket_price BETWEEN ? AND ?";
    $params[] = $minPrice; $params[] = $maxPrice;

    $db   = getDB();
    $stmt = $db->prepare("
        SELECT e.event_id, e.title, e.event_date, e.available_seats, e.ticket_price, e.status,
               c.name AS category, c.color_hex, v.name AS venue, v.city
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        JOIN venues     v ON e.venue_id     = v.venue_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY e.event_date ASC
        LIMIT 30
    ");
    $stmt->execute($params);
    jsonResponse(true, 'Search results.', $stmt->fetchAll());
}

// ============================================================
//  REPORTS
// ============================================================

function getReports(): void {
    requireAdmin();
    $db   = getDB();
    $type = $_GET['type'] ?? 'overview';

    switch ($type) {
        case 'revenue':
            $data = $db->query("
                SELECT DATE_FORMAT(paid_at,'%Y-%m') AS month,
                       COUNT(*) AS transactions,
                       SUM(amount) AS revenue
                FROM payments WHERE status='completed'
                GROUP BY month ORDER BY month DESC LIMIT 12
            ")->fetchAll();
            break;

        case 'top_events':
            $data = $db->query("
                SELECT * FROM vw_event_summary
                ORDER BY total_revenue DESC LIMIT 10
            ")->fetchAll();
            break;

        case 'participants':
            $data = $db->query("
                SELECT e.title, COUNT(b.booking_id) AS bookings,
                       SUM(b.num_tickets) AS tickets_sold,
                       SUM(b.total_amount) AS revenue
                FROM events e
                LEFT JOIN bookings b ON e.event_id = b.event_id AND b.status != 'cancelled'
                GROUP BY e.event_id ORDER BY tickets_sold DESC
            ")->fetchAll();
            break;

        case 'payments':
            $data = $db->query("
                SELECT method, COUNT(*) AS count, SUM(amount) AS total
                FROM payments WHERE status='completed'
                GROUP BY method
            ")->fetchAll();
            break;

        default: // overview
            $data = [
                'events_by_status' => $db->query("SELECT status, COUNT(*) AS count FROM events GROUP BY status")->fetchAll(),
                'bookings_by_status'=> $db->query("SELECT status, COUNT(*) AS count FROM bookings GROUP BY status")->fetchAll(),
                'revenue_today'    => $db->query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE DATE(paid_at)=CURDATE() AND status='completed'")->fetchColumn(),
                'revenue_month'    => $db->query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE MONTH(paid_at)=MONTH(NOW()) AND status='completed'")->fetchColumn(),
                'top_venue'        => $db->query("SELECT v.name, COUNT(e.event_id) AS events FROM venues v LEFT JOIN events e ON v.venue_id=e.venue_id GROUP BY v.venue_id ORDER BY events DESC LIMIT 1")->fetch(),
            ];
    }

    jsonResponse(true, "Report: $type", $data);
}

// ============================================================
//  FEEDBACK
// ============================================================

function submitFeedback(): void {
    $sess   = requireAuth();
    $data   = getInput();
    $db     = getDB();

    $eventId = (int)($data['event_id'] ?? 0);
    $rating  = (int)($data['rating']   ?? 0);
    $comment = sanitize($data['comment'] ?? '');

    if (!$eventId || $rating < 1 || $rating > 5) {
        jsonResponse(false, 'event_id and rating (1-5) required.', null, 422);
    }

    try {
        $db->prepare("INSERT INTO event_feedback (event_id, user_id, rating, comment) VALUES (?,?,?,?)")
           ->execute([$eventId, $sess['user_id'], $rating, $comment]);
        jsonResponse(true, 'Feedback submitted. Thank you!', null, 201);
    } catch (PDOException $e) {
        jsonResponse(false, 'You have already submitted feedback for this event.', null, 409);
    }
}
