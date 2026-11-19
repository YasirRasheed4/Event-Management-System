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
- Supabase Auth and PostgreSQL
- Supabase JavaScript client

## Website

Visit the live application: [https://eventsphere.freedev.app/](https://eventsphere.freedev.app/)

## Supabase setup

1. Create or open the Supabase project configured in `supabase-adapter.js`.
2. Open **SQL Editor** in Supabase and run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, enable Email. Keep email confirmation enabled for production.
4. Register an account from the app.
5. To make the first account an administrator, open **Table Editor → profiles** and change its `role_id` to `1`.
6. Host this folder as a static site. No PHP server is required for the browser app.

The browser uses the Supabase publishable key in `supabase-adapter.js`. This key is designed for public clients; database access is protected by the RLS policies in `supabase/schema.sql`. Never put a Supabase secret/service-role key in the browser.

## Legacy PHP/MySQL files

`api.php`, `database.sql`, and `config.example.php` are retained as the original PHP/MySQL implementation. They are no longer used by the frontend after the Supabase migration.

## Project Files

- `index.html` - application interface
- `style.css` - visual styling and responsive layout
- `script.js` - frontend interactions and API requests
- `supabase-adapter.js` - Supabase client and data operations
- `supabase/schema.sql` - PostgreSQL tables, Auth profile trigger, RPC, and RLS policies
- `api.php` - legacy PHP API
- `database.sql` - legacy MySQL schema
