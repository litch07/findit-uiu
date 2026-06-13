---

# FindIt UIU

A dedicated lost and found platform for secure item recovery and campus connectivity.
Built specifically for the students and staff of United International University (UIU).

---

## What It Does

- Students submit lost or found reports that go live only after admin approval.
- Accepted claims automatically open a private message thread between the two students.
- Admins can ban and unban student accounts from the user management panel.
- Users can upload images and tag their items with specific categories.
- Real-time in-app notifications inform users about claim requests, messages, and administrative actions.
- Admins can view and export system activity logs, user lists, and item reports to CSV files.
- Claimants must provide verifiable proof when claiming found items to ensure secure handovers.

---

## Tech Stack

| Backend | Frontend |
|---------|----------|
| Laravel 11 | HTML5 / CSS3 / Vanilla JS |

*Database*: MySQL 8+
*Authentication*: Laravel Sanctum

---

## Roles

| Role | What They Can Do |
|------|-----------------|
| Student | Can submit lost/found reports, file claims, message other students for coordination, and manage their own profiles. |
| Admin | Can approve or reject item reports, manage student accounts (including banning/unbanning), and monitor or export system activity logs. |

---

## Prerequisites

- PHP 8.2+
- Composer 2+
- MySQL 8+
- VS Code with Live Server extension
- Git

Note: Node.js is NOT required as the frontend uses Vanilla JS without a build step.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/litch07/findit-uiu.git
cd findit-uiu
```

### 2. Database Setup

METHOD A — MySQL CLI (Linux / Mac):
```bash
mysql -u root -p
CREATE DATABASE findit_uiu;
USE findit_uiu;
SOURCE /full/path/to/database/schema.sql;
SOURCE /full/path/to/database/seed.sql;
EXIT;
```

METHOD B — MySQL CLI (Windows CMD):
```cmd
mysql -u root -p
CREATE DATABASE findit_uiu;
USE findit_uiu;
source C:\full\path\to\database\schema.sql
source C:\full\path\to\database\seed.sql
EXIT;
```

METHOD C — phpMyAdmin (beginner friendly):
1. Open phpMyAdmin in your browser
2. Create a new database named findit_uiu
3. Click the database → Import tab
4. Import schema.sql first, then seed.sql

### 3. Backend Setup

```bash
cd backend
composer install
```

Then copy the environment file:
```bash
# Linux / Mac
cp .env.example .env

# Windows CMD
copy .env.example .env
```

Open .env and fill in these values:
DB_DATABASE=findit_uiu
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_FROM_ADDRESS=your_gmail@gmail.com

Generate your Gmail App Password by going to your Google Account → Security → 2-Step Verification → App passwords.

Then run:
```bash
php artisan key:generate
php artisan storage:link
```

### 4. Run the Backend

```bash
php artisan serve
```

Backend runs at: http://localhost:8000
Keep this terminal open.

### 5. Run the Frontend

1. Open the project root folder in VS Code
2. Right-click frontend/pages/index.html
3. Select "Open with Live Server"
4. Frontend opens at http://127.0.0.1:5500

Important note: Both the backend (port 8000) and Live Server (port 5500) must be running at the same time.

---

## Demo Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | findituiu@gmail.com | password | Full admin privileges |
| Student | sahmed2330154@bscse.uiu.ac.bd | password | Has existing posts and claims for testing |
| Student | mprodhan2330411@bscse.uiu.ac.bd | password | Has existing posts and claims for testing |

---

## Project Structure

findit-uiu/
├── backend/                  # Laravel 11 REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/  # API controllers
│   │   │   └── Middleware/   # Auth & role checks
│   │   └── Models/           # Eloquent models
│   ├── resources/views/      # Email blade templates
│   └── routes/api.php        # All API route definitions
├── frontend/                 # Plain HTML/CSS/JS
│   ├── pages/                # All HTML pages
│   ├── css/                  # Global and page styles
│   ├── js/                   # Global and page scripts
│   └── assets/               # Logo SVG files
├── database/
│   ├── schema.sql            # Full database structure
│   └── seed.sql              # Demo data
├── API.md                    # Full API reference
└── README.md                 # System documentation

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| DB_CONNECTION | Database driver |
| DB_HOST | Database host |
| DB_PORT | Database port |
| DB_DATABASE | Database name |
| DB_USERNAME | Your MySQL username |
| DB_PASSWORD | Your MySQL password |
| MAIL_MAILER | Mail driver |
| MAIL_HOST | SMTP host |
| MAIL_PORT | SMTP port |
| MAIL_USERNAME | Your email address |
| MAIL_PASSWORD | Your email app password |
| MAIL_ENCRYPTION | Mail encryption |
| MAIL_FROM_ADDRESS | Sender email address |
| APP_URL | Backend URL |
| FRONTEND_URL | Frontend URL |

---

## Common Issues

**Problem:** Images don't appear
**Fix:** Run `php artisan storage:link` in the backend folder to link the public storage directory.

**Problem:** Frontend can't reach backend (CORS error)
**Fix:** Ensure your Live Server is running exactly on `127.0.0.1:5500` or `localhost:5500` as defined in `SANCTUM_STATEFUL_DOMAINS` in the `.env` file.

**Problem:** Mail not sending
**Fix:** Ensure you are using a generated Google App Password, not your actual Gmail account password, and that 2-Step Verification is enabled on your Google account.

**Problem:** 500 error on login
**Fix:** Ensure you have run `php artisan key:generate` to set the `APP_KEY` in your `.env` file.

---

## API Reference

Full API documentation is available in [API.md](./API.md).

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

