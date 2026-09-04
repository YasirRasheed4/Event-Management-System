-- ============================================================
--  EVENT MANAGEMENT SYSTEM — DATABASE SCHEMA
--  University Lab Project | MySQL 8.0+
--  Author: Student Project | Normalized to 3NF
-- ============================================================
-- ============================================================
-- TABLE 1: ROLES  (lookup / normalization table)
-- ============================================================
CREATE TABLE roles (
    role_id     TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(30) NOT NULL UNIQUE,   -- 'admin', 'organizer', 'participant'
    description VARCHAR(120)
) ENGINE=InnoDB;

INSERT INTO roles (role_name, description) VALUES
  ('admin',       'Full system access'),
  ('organizer',   'Can create and manage events'),
  ('participant', 'Can register and book tickets');

-- ============================================================
-- TABLE 2: USERS
-- ============================================================
CREATE TABLE users (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id       TINYINT UNSIGNED NOT NULL DEFAULT 3,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    profile_pic   VARCHAR(255) DEFAULT 'default.png',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 3: CATEGORIES  (normalization — avoids repeating strings)
-- ============================================================
CREATE TABLE categories (
    category_id   SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(60) NOT NULL UNIQUE,   -- 'Conference','Workshop','Concert' …
    icon          VARCHAR(60) DEFAULT 'tag',
    color_hex     CHAR(7)    DEFAULT '#6366f1'
) ENGINE=InnoDB;

INSERT INTO categories (name, icon, color_hex) VALUES
  ('Conference',  'microphone', '#6366f1'),
  ('Workshop',    'tool',       '#f59e0b'),
  ('Concert',     'music',      '#ec4899'),
  ('Sports',      'trophy',     '#10b981'),
  ('Exhibition',  'image',      '#3b82f6'),
  ('Seminar',     'book',       '#8b5cf6'),
  ('Networking',  'users',      '#14b8a6'),
  ('Hackathon',   'code',       '#f97316');

-- ============================================================
-- TABLE 4: VENUES
-- ============================================================
CREATE TABLE venues (
    venue_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    address      VARCHAR(255) NOT NULL,
    city         VARCHAR(80)  NOT NULL,
    country      VARCHAR(80)  NOT NULL DEFAULT 'Pakistan',
    capacity     SMALLINT UNSIGNED NOT NULL,
    contact_info VARCHAR(120),
    facilities   TEXT,                   -- JSON-style or comma-separated
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO venues (name, address, city, capacity, contact_info, facilities) VALUES
  ('Grand Convention Hall', 'Blue Area, Jinnah Ave', 'Islamabad', 2000, '+92-51-1234567', 'WiFi, Projector, Stage, Parking, Cafeteria'),
  ('Expo Center',           'Johar Town',            'Lahore',    5000, '+92-42-9876543', 'WiFi, Multiple Halls, Food Court, AC'),
  ('Tech Hub Auditorium',   'Gulshan-e-Iqbal',       'Karachi',   800,  '+92-21-5556677', 'WiFi, Recording Studio, Green Room'),
  ('University Auditorium', 'University Road',        'Peshawar',  600,  '+92-91-9112233', 'WiFi, AC, Stage, Projector'),
  ('City Arts Center',      'Saddar',                 'Rawalpindi',1200, '+92-51-4441122', 'Gallery, Stage, Parking');

-- ============================================================
-- TABLE 5: EVENTS
-- ============================================================
CREATE TABLE events (
    event_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organizer_id   INT UNSIGNED NOT NULL,
    category_id    SMALLINT UNSIGNED NOT NULL,
    venue_id       INT UNSIGNED NOT NULL,
    title          VARCHAR(200) NOT NULL,
    slug           VARCHAR(220) NOT NULL UNIQUE,       -- SEO-friendly URL key
    description    TEXT,
    banner_image   VARCHAR(255) DEFAULT 'default_event.jpg',
    event_date     DATE NOT NULL,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    total_seats    SMALLINT UNSIGNED NOT NULL,
    available_seats SMALLINT UNSIGNED NOT NULL,
    ticket_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status         ENUM('draft','published','cancelled','completed') NOT NULL DEFAULT 'draft',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id)  REFERENCES users(user_id),
    CONSTRAINT fk_events_category  FOREIGN KEY (category_id)   REFERENCES categories(category_id),
    CONSTRAINT fk_events_venue     FOREIGN KEY (venue_id)      REFERENCES venues(venue_id),
    CONSTRAINT chk_seats CHECK (available_seats <= total_seats),
    CONSTRAINT chk_times CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 6: TICKET TYPES  (per-event ticket tiers)
-- ============================================================
CREATE TABLE ticket_types (
    ticket_type_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id        INT UNSIGNED NOT NULL,
    type_name       VARCHAR(60)  NOT NULL,   -- 'General','VIP','Student'
    price           DECIMAL(10,2) NOT NULL,
    quantity        SMALLINT UNSIGNED NOT NULL,
    sold            SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    benefits        VARCHAR(255),
    CONSTRAINT fk_tt_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 7: BOOKINGS  (participant ↔ event registration)
-- ============================================================
CREATE TABLE bookings (
    booking_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    event_id        INT UNSIGNED NOT NULL,
    ticket_type_id  INT UNSIGNED,
    booking_ref     VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. EMS-2025-00001
    num_tickets     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    total_amount    DECIMAL(10,2) NOT NULL,
    status          ENUM('pending','confirmed','cancelled','attended') NOT NULL DEFAULT 'pending',
    booked_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_user        FOREIGN KEY (user_id)        REFERENCES users(user_id),
    CONSTRAINT fk_bookings_event       FOREIGN KEY (event_id)       REFERENCES events(event_id),
    CONSTRAINT fk_bookings_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(ticket_type_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 8: PAYMENTS
-- ============================================================
CREATE TABLE payments (
    payment_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT UNSIGNED NOT NULL UNIQUE,   -- 1-to-1 with booking
    amount          DECIMAL(10,2) NOT NULL,
    method          ENUM('cash','card','bank_transfer','easypaisa','jazzcash') NOT NULL,
    status          ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    transaction_ref VARCHAR(100),
    paid_at         TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 9: PARTICIPANTS  (extended profile — 1-to-1 with users where role=participant)
-- ============================================================
CREATE TABLE participants (
    participant_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL UNIQUE,
    institution     VARCHAR(150),
    designation     VARCHAR(100),
    bio             TEXT,
    linkedin_url    VARCHAR(255),
    CONSTRAINT fk_participants_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 10: EVENT_FEEDBACK  (post-event ratings)
-- ============================================================
CREATE TABLE event_feedback (
    feedback_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id     INT UNSIGNED NOT NULL,
    user_id      INT UNSIGNED NOT NULL,
    rating       TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_feedback (event_id, user_id),
    CONSTRAINT fk_feedback_event FOREIGN KEY (event_id) REFERENCES events(event_id),
    CONSTRAINT fk_feedback_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ============================================================
-- INDEXES  (performance optimization)
-- ============================================================
CREATE INDEX idx_events_date     ON events(event_date);
CREATE INDEX idx_events_status   ON events(status);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_bookings_user   ON bookings(user_id);
CREATE INDEX idx_bookings_event  ON bookings(event_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- SAMPLE DATA — USERS
-- ============================================================
INSERT INTO users (role_id, full_name, email, phone, password_hash) VALUES
  (1, 'Admin User',       'admin@ems.com',       '+92-300-0000001', '$2y$12$adminHashHere'),
  (2, 'Sara Khan',        'sara@ems.com',         '+92-301-1112222', '$2y$12$organizerHash'),
  (2, 'Ali Raza',         'ali@ems.com',           '+92-302-3334444', '$2y$12$organizer2Hash'),
  (3, 'Ahmed Malik',      'ahmed@student.edu.pk', '+92-303-5556666', '$2y$12$participantHash'),
  (3, 'Fatima Noor',      'fatima@student.edu.pk','+92-304-7778888', '$2y$12$participant2Hash'),
  (3, 'Usman Tariq',      'usman@student.edu.pk', '+92-305-9990000', '$2y$12$participant3Hash');

-- ============================================================
-- SAMPLE DATA — EVENTS
-- ============================================================
INSERT INTO events (organizer_id, category_id, venue_id, title, slug, description, event_date, start_time, end_time, total_seats, available_seats, ticket_price, status) VALUES
  (2, 1, 1, 'National Tech Conference 2025',        'national-tech-conf-2025',    'Annual flagship technology conference bringing together industry leaders.', '2025-09-15', '09:00:00', '18:00:00', 500, 320, 2500.00, 'published'),
  (2, 2, 3, 'AI & Machine Learning Workshop',       'ai-ml-workshop-2025',        'Hands-on workshop covering ML fundamentals to advanced neural networks.', '2025-08-20', '10:00:00', '16:00:00', 80,  45,  1500.00, 'published'),
  (3, 7, 2, 'Startup Networking Night',             'startup-networking-2025',    'Connect with founders, investors, and innovators in one room.', '2025-07-10', '18:00:00', '22:00:00', 200, 150, 500.00,  'published'),
  (3, 8, 3, 'University Hackathon 2025',            'uni-hackathon-2025',         '48-hour coding competition with prizes worth PKR 500,000.', '2025-10-05', '08:00:00', '20:00:00', 300, 210, 0.00,    'published'),
  (2, 6, 4, 'Cloud Computing Seminar',              'cloud-seminar-2025',         'Deep dive into AWS, Azure, and GCP for enterprise solutions.', '2025-07-25', '09:30:00', '14:00:00', 120, 70,  800.00,  'published');

-- ============================================================
-- SAMPLE DATA — TICKET TYPES
-- ============================================================
INSERT INTO ticket_types (event_id, type_name, price, quantity, benefits) VALUES
  (1, 'General',  2500.00, 400, 'Access to all sessions, lunch, kit bag'),
  (1, 'VIP',      5000.00, 80,  'Front seating, networking dinner, speaker meet & greet, premium kit'),
  (1, 'Student',  1000.00, 20,  'Student discount, all sessions, certificate'),
  (2, 'Standard', 1500.00, 70,  'Full workshop, materials, certificate'),
  (2, 'Premium',  2500.00, 10,  'Workshop + 1-on-1 mentoring session');

-- ============================================================
-- SAMPLE DATA — BOOKINGS
-- ============================================================
INSERT INTO bookings (user_id, event_id, ticket_type_id, booking_ref, num_tickets, total_amount, status) VALUES
  (4, 1, 3, 'EMS-2025-00001', 1, 1000.00, 'confirmed'),
  (5, 1, 1, 'EMS-2025-00002', 2, 5000.00, 'confirmed'),
  (6, 2, 4, 'EMS-2025-00003', 1, 1500.00, 'confirmed'),
  (4, 3, NULL,'EMS-2025-00004',1,  500.00, 'pending'),
  (5, 4, NULL,'EMS-2025-00005',1,    0.00, 'confirmed');

-- ============================================================
-- SAMPLE DATA — PAYMENTS
-- ============================================================
INSERT INTO payments (booking_id, amount, method, status, transaction_ref, paid_at) VALUES
  (1, 1000.00, 'easypaisa',     'completed', 'EP-78451236', NOW()),
  (2, 5000.00, 'card',          'completed', 'CARD-XY9912', NOW()),
  (3, 1500.00, 'bank_transfer', 'completed', 'BT-44123099', NOW()),
  (4,  500.00, 'jazzcash',      'pending',   NULL,          NULL);

-- ============================================================
-- USEFUL VIEWS  (for dashboard & reports)
-- ============================================================

-- View: Event summary with booking counts
CREATE OR REPLACE VIEW vw_event_summary AS
SELECT
    e.event_id,
    e.title,
    c.name          AS category,
    v.name          AS venue,
    e.event_date,
    e.total_seats,
    e.available_seats,
    (e.total_seats - e.available_seats) AS seats_sold,
    e.ticket_price,
    e.status,
    COUNT(b.booking_id)                 AS total_bookings,
    COALESCE(SUM(b.total_amount), 0)    AS total_revenue
FROM events e
JOIN categories c ON e.category_id = c.category_id
JOIN venues     v ON e.venue_id     = v.venue_id
LEFT JOIN bookings b ON e.event_id  = b.event_id AND b.status != 'cancelled'
GROUP BY e.event_id;

-- View: Booking details with participant info
CREATE OR REPLACE VIEW vw_booking_details AS
SELECT
    b.booking_ref,
    u.full_name      AS participant_name,
    u.email,
    u.phone,
    e.title          AS event_title,
    e.event_date,
    tt.type_name     AS ticket_type,
    b.num_tickets,
    b.total_amount,
    b.status         AS booking_status,
    p.method         AS payment_method,
    p.status         AS payment_status,
    b.booked_at
FROM bookings b
JOIN users        u  ON b.user_id        = u.user_id
JOIN events       e  ON b.event_id       = e.event_id
LEFT JOIN ticket_types tt ON b.ticket_type_id = tt.ticket_type_id
LEFT JOIN payments p  ON b.booking_id    = p.payment_id;

-- View: Revenue by month
CREATE OR REPLACE VIEW vw_monthly_revenue AS
SELECT
    DATE_FORMAT(p.paid_at, '%Y-%m') AS month,
    COUNT(p.payment_id)             AS transactions,
    SUM(p.amount)                   AS total_revenue
FROM payments
WHERE p.status = 'completed'
GROUP BY DATE_FORMAT(p.paid_at, '%Y-%m')
ORDER BY month DESC;

-- ============================================================
-- STORED PROCEDURE: Register a participant & create booking
-- ============================================================
DELIMITER $$

CREATE PROCEDURE sp_create_booking(
    IN  p_user_id       INT UNSIGNED,
    IN  p_event_id      INT UNSIGNED,
    IN  p_ticket_type   INT UNSIGNED,
    IN  p_num_tickets   TINYINT UNSIGNED,
    OUT p_booking_ref   VARCHAR(20),
    OUT p_message       VARCHAR(100)
)
BEGIN
    DECLARE v_available INT;
    DECLARE v_price     DECIMAL(10,2);
    DECLARE v_total     DECIMAL(10,2);

    -- Lock event row
    SELECT available_seats, ticket_price
    INTO   v_available, v_price
    FROM   events
    WHERE  event_id = p_event_id
    FOR UPDATE;

    IF v_available < p_num_tickets THEN
        SET p_booking_ref = NULL;
        SET p_message     = 'Not enough seats available';
    ELSE
        SET v_total = v_price * p_num_tickets;
        SET p_booking_ref = CONCAT('EMS-', YEAR(NOW()), '-', LPAD(LAST_INSERT_ID()+1, 5, '0'));

        INSERT INTO bookings (user_id, event_id, ticket_type_id, booking_ref, num_tickets, total_amount)
        VALUES (p_user_id, p_event_id, p_ticket_type, p_booking_ref, p_num_tickets, v_total);

        UPDATE events
        SET available_seats = available_seats - p_num_tickets
        WHERE event_id = p_event_id;

        SET p_message = 'Booking created successfully';
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- TRIGGER: Auto-update available_seats on booking cancel
-- ============================================================
DELIMITER $$

CREATE TRIGGER trg_booking_cancel
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE events
        SET available_seats = available_seats + OLD.num_tickets
        WHERE event_id = OLD.event_id;
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- SAMPLE REPORTS (run these in MySQL Workbench for viva)
-- ============================================================

-- Report 1: Top events by revenue
-- SELECT title, total_bookings, total_revenue, seats_sold FROM vw_event_summary ORDER BY total_revenue DESC;

-- Report 2: All bookings for an event
-- SELECT * FROM vw_booking_details WHERE event_title = 'National Tech Conference 2025';

-- Report 3: Events in next 30 days
-- SELECT title, event_date, available_seats, ticket_price FROM events WHERE event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status='published';

-- Report 4: Total revenue this month
-- SELECT SUM(amount) AS monthly_revenue FROM payments WHERE MONTH(paid_at)=MONTH(NOW()) AND status='completed';

-- Report 5: Participants per event
-- SELECT e.title, COUNT(b.booking_id) AS participants FROM events e LEFT JOIN bookings b ON e.event_id=b.event_id GROUP BY e.event_id;
