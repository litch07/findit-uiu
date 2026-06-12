# FindIt UIU

FindIt UIU is a dedicated lost and found platform built exclusively for the students and administration of United International University in Dhaka. It provides a secure, moderated environment for students to report missing items, submit found property, and coordinate returns.

---

## What It Does

* Students submit lost or found reports that only go live after admin approval.
* Users can submit secure ownership claims on found items or provide recovery details for lost items.
* Accepted claims automatically generate a private chat conversation between the finder and the original owner.
* The system sends automated email and in-app notifications for approvals, claims, and messages.
* Students can mark their items as resolved once property has been successfully returned.
* Administrators monitor platform statistics, moderate incoming reports, and have the ability to ban abusive users.

---

## Tech Stack

| Backend | Frontend |
|---------|----------|
| PHP 8.2 | Plain HTML5 |
| Laravel 11.0 | Vanilla JavaScript (ES6+) |
| Laravel Sanctum 4.3 | Vanilla CSS3 (Custom Variables) |
| MySQL 8.0 | Fetch API (No Axios or jQuery) |

---

## Roles

| Role | What they can do |
|------|-----------------|
| **Student** | Can browse approved reports, post new lost/found items, submit claims, message other users, and update their profile. |
| **Admin** | Can view platform statistics, approve or reject pending items, manage user bans, and review comprehensive activity logs. |

---

## Prerequisites

- PHP 8.2 or higher
- Composer 2
- MySQL 8
- VS Code with Live Server extension (for serving the frontend)

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/findit-uiu.git
cd findit-uiu
```

### 2. Database Setup

**Linux / Mac**
```bash
mysql -u root -p
CREATE DATABASE findit_uiu;
USE findit_uiu;
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

**Windows CMD**
```cmd
mysql -u root -p
CREATE DATABASE findit_uiu;
USE findit_uiu;
source C:/path/to/findit-uiu/database/schema.sql
source C:/path/to/findit-uiu/database/seed.sql
```

**phpMyAdmin Alternative**
1. Open phpMyAdmin and create a new database named `findit_uiu`.
2. Click on the new database, go to the **Import** tab.
3. Choose `database/schema.sql` and click **Go**.
4. Once completed, repeat the process and import `database/seed.sql`.

### 3. Backend Setup

```bash
cd backend
composer install
```

**Linux / Mac**
```bash
cp .env.example .env
```

**Windows CMD**
```cmd
copy .env.example .env
```

After copying the environment file, generate the app key and link storage:
```bash
php artisan key:generate
php artisan storage:link
```

You must update your `.env` file with your database credentials (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) and set your Gmail SMTP settings (`MAIL_MAILER=smtp`, `MAIL_USERNAME`, `MAIL_PASSWORD`). To generate a Gmail App Password, go to your Google Account → Security → 2-Step Verification → App passwords.

### 4. Running the Backend

```bash
php artisan serve
```
Note: this runs the backend API at `http://localhost:8000`.

### 5. Running the Frontend

The frontend is built with plain HTML, so no Node.js or build steps are required.
- Open the `frontend/` folder in VS Code.
- Right-click on `index.html` → **Open with Live Server**.
- Live Server will run the application at `http://127.0.0.1:5500`.
- Both the backend (port 8000) and Live Server (port 5500) must be running at the same time for the API calls to work.

---

## Demo Accounts

The database comes pre-seeded with the following demo accounts. All passwords are set to `password`.

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | `findituiu@gmail.com` | `password` | Has full access to dashboard, logs, and moderation tools. |
| Student | `sahmed2330154@bscse.uiu.ac.bd` | `password` | Has existing posts, claims, and active messages for testing. |
| Student | `mprodhan2330411@bscse.uiu.ac.bd` | `password` | Demo student account with a few interactions. |
| Student | `mnur2230442@bscse.uiu.ac.bd` | `password` | Additional tester account. |

---

## Project Structure

```text
findit-uiu/
├── backend/                  # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/Api/  # All API controllers
│   │   ├── Models/                # Eloquent models
│   │   └── Services/              # Helper services (Email, Resolution)
│   ├── routes/
│   │   └── api.php                # All API routes
│   └── ...
├── frontend/                 # Plain HTML/CSS/JS
│   ├── pages/                # All HTML pages (admin, dashboard, browse, etc.)
│   ├── css/                  # Global and page-specific stylesheets
│   └── js/                   # Vanilla JavaScript logic and API fetch wrappers
├── database/
│   ├── schema.sql            # Full MySQL database schema
│   └── seed.sql              # Demo data including users and items
├── API.md                    # Full API reference
└── README.md                 # Project documentation
```

---

## Environment Variables

The following variables in `backend/.env` must be updated to run the application locally:

| Variable | Description |
|----------|-------------|
| DB_DATABASE | Your local database name (e.g., `findit_uiu`) |
| DB_USERNAME | MySQL username |
| DB_PASSWORD | MySQL password |
| MAIL_USERNAME | Gmail address for sending emails |
| MAIL_PASSWORD | Gmail App Password (not your Gmail password) |

To generate a Gmail App Password, go to your Google Account → Security → 2-Step Verification → App passwords.

---

## API Reference

Full API documentation is available in [API.md](./API.md).
