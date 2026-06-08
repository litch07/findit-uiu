# FindIt UIU

FindIt UIU is a dedicated Lost & Found portal built specifically for the students and staff of United International University (UIU). It provides a secure, organized platform to report lost items, browse found items, and coordinate returns safely on campus.

## What It Does

- Students can post lost or found reports which go live only after admin approval.
- An integrated claims system allows students to provide proof of ownership for found items securely.
- Built-in real-time messaging helps students coordinate handovers without sharing personal phone numbers publicly.
- A comprehensive notification system alerts users about new matches, claim updates, and received messages.
- Admins have access to a dedicated dashboard to moderate reports, manage user bans, and review platform activity logs.
- Search and filtering capabilities help students quickly find specific items by category, keyword, or status.
- Detailed statistics track and display the number of items users have successfully recovered or returned.

## Tech Stack

| Backend | Frontend |
| :--- | :--- |
| Laravel 11 | HTML5 |
| PHP 8.2 | Vanilla JavaScript |
| MySQL 8 | CSS3 |
| Laravel Sanctum | Chart.js |

## Roles

| Role | What they can do |
| :--- | :--- |
| **Admin** | Can approve or reject item reports, manage user bans, and monitor activity logs. |
| **Student** | Can post lost/found reports, submit item claims, and message other students to coordinate returns. |

## Prerequisites

- PHP 8.2+
- Composer 2+
- Node.js 18+
- MySQL 8+
- A code editor with Live Server extension (VS Code recommended)

## Getting Started

### 1. Clone the repository
Open your terminal or command prompt and run:
```bash
git clone https://github.com/litch07/findit-uiu.git
cd findit-uiu
```

### 2. Database setup
You need to create the database schema and populate it with initial data.

**Windows (CMD/PowerShell with XAMPP):**
```cmd
"C:\xampp\mysql\bin\mysql.exe" -u root < database\schema.sql
"C:\xampp\mysql\bin\mysql.exe" -u root findit_uiu < database\seed.sql
```
*Note: If your MySQL is in your system PATH, you can just use `mysql` instead of the full path.*

**Linux/Mac (Terminal):**
```bash
mysql -u root < database/schema.sql
mysql -u root findit_uiu < database/seed.sql
```

*Alternative (phpMyAdmin):* You can also create a new database named `findit_uiu` in phpMyAdmin, then use the "Import" tab to upload `schema.sql` first, followed by `seed.sql`.

### 3. Backend setup
Navigate into the backend folder to install dependencies and configure the environment:
```bash
cd backend
composer install
```

Copy the example environment file:
**Windows (CMD):**
```cmd
copy .env.example .env
```
**Linux/Mac (Terminal):**
```bash
cp .env.example .env
```

Open the `.env` file and fill in your database credentials:
```env
DB_DATABASE=findit_uiu
DB_USERNAME=root
DB_PASSWORD=
```
To enable the password reset and email verification features, configure the Gmail SMTP settings in the `.env` file:
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
```
Finally, generate the application key and link the storage directory:
```bash
php artisan key:generate
php artisan storage:link
```

### 4. Frontend setup
The frontend runs entirely on plain HTML, CSS, and JavaScript. Open the `findit-uiu/frontend` folder in VS Code. In the file explorer, right-click on `pages/index.html` and select **"Open with Live Server"**. 
This will automatically open your browser and launch the frontend at `http://127.0.0.1:5500/pages/index.html` (the port may be 5501 if 5500 is already in use).

### 5. Running the project
You must run both the backend API and the frontend Live Server simultaneously for the project to work properly.
1. In one terminal, navigate to the `backend` folder and run `php artisan serve`. This keeps the API running at `http://127.0.0.1:8000`.
2. Keep the backend running and use the VS Code Live Server to keep the frontend running. The two will automatically communicate.

## Demo Accounts

| Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| Admin | findituiu@gmail.com | admin123 | Full admin access |
| Student | sahmed2330154@bscse.uiu.ac.bd | password123 | Has existing posts (lost/found) and active claims for testing |
| Student | mprodhan2330411@bscse.uiu.ac.bd | password123 | Has existing posts and submitted claims |
| Student | mnur2230442@bscse.uiu.ac.bd | password123 | Has existing posts and received messages |

## Project Structure

- `backend/` - Contains the entire Laravel 11 REST API, configuration files, and API routes.
- `database/` - Holds `schema.sql` (table definitions) and `seed.sql` (dummy data and test accounts).
- `frontend/css/` - Global and page-specific stylesheets (no external CSS frameworks used).
- `frontend/js/` - Vanilla JavaScript logic including API integrations (`api.js`), auth (`auth.js`), and page-specific scripts.
- `frontend/pages/` - All the raw HTML views for the student portal and admin dashboard.
- `docs/` - Contains the team workflow documentation and API reference.

## Environment Variables

The following key `.env` variables in the `backend` directory must be set for the app to work:
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`

You can get a Gmail App Password by enabling 2-Step Verification in your Google Account and creating an app-specific password in the Security settings.

## API Reference

For detailed information on all available endpoints, request formats, and authentication methods, please see the [API Documentation](API.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
