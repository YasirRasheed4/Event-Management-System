# EventSphere

Event management system for organizing events, venues, bookings, users, and payments.

## Features

- User registration and secure login
- Role-based access for administrators, organizers, and participants
- Event, venue, and category management
- Event booking and booking-status management
- Payment and revenue reporting
- Participant-specific booking history
- Responsive dashboard interface

## Technology

- HTML, CSS, and vanilla JavaScript
- PHP 8+
- MySQL
- PDO for database access

## Website

Visit the live application: [https://eventsphere.freedev.app/](https://eventsphere.freedev.app/)

## Local Development

Run the PHP development server from this folder:

```powershell
php -S localhost:8000
```

Then open `http://localhost:8000/index.html`.

## Database Setup

1. Create a MySQL database.
2. Import `database.sql` using phpMyAdmin or the MySQL command line.
3. Copy `config.example.php` to `config.php`.
4. Add your private database connection values to `config.php`.
5. Keep `config.php` out of GitHub; it is listed in `.gitignore`.

## Project Files

- `index.html` - application interface
- `style.css` - visual styling and responsive layout
- `script.js` - frontend interactions and API requests
- `api.php` - PHP API and authentication handlers
- `database.sql` - database schema and sample structure
- `config.example.php` - safe configuration template

Database credentials belong in a local or hosted `config.php` file and must not be committed to GitHub.