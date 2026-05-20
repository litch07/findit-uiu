# FindIt UIU

FindIt UIU is a Lost and Found portal for United International University. Students can report lost or found items, browse approved posts, submit claims or found reports, and coordinate handover through messaging.

This project is built for a Web Programming course using plain HTML, CSS, JavaScript, Laravel 11, and MySQL.

## Team

- Sadid Ahmed - 0112330154
- M.M. Sayem Prodhan - 0112330411
- Md. Assaduzzaman Nur - 0112230442

## Current Features

- Student and admin login
- Student registration with email verification
- Seeded users, categories, lost reports, and found reports
- Browse and filter approved posts
- Student dashboard and profile page
- Lost/found report submission
- Admin approval queue
- Item detail page
- Claim requests and found reports
- My Reports dashboard with claims tabs
- Basic conversations
- Paginated notifications
- Landing page counters

## Tech Stack

| Part | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Laravel 11 REST API |
| Database | MySQL 8 |
| Auth | Laravel Sanctum |
| Mail | Gmail SMTP |

## Project Structure

```text
findit-portal/
  backend/      Laravel API
  database/     schema.sql and seed.sql
  frontend/     HTML, CSS, and JavaScript pages
  docs/         API guide, team workflow, and demo plan
```

## Requirements

- PHP 8.2 or newer
- Composer
- MySQL 8 or XAMPP MySQL
- VS Code Live Server or any local static file server

## Setup on Windows (CMD / PowerShell)

1. **Clone the project:**
   ```cmd
   git clone https://github.com/litch07/findit-uiu.git
   cd findit-uiu
   ```

2. **Database Setup:**
   Ensure MySQL (via XAMPP or native) is running. Open CMD/Terminal and run:
   ```cmd
   mysql -u root < database\schema.sql
   mysql -u root findit_uiu < database\seed.sql
   ```
   *If `mysql` is not recognized and you use XAMPP, use the full path:*
   ```cmd
   "C:\xampp\mysql\bin\mysql.exe" -u root < database\schema.sql
   "C:\xampp\mysql\bin\mysql.exe" -u root findit_uiu < database\seed.sql
   ```
   *Note: If your root user has a password, add `-p` to the commands.*

3. **Backend Setup:**
   ```cmd
   cd backend
   composer install
   copy .env.example .env
   php artisan key:generate
   php artisan storage:link
   ```
   Edit `.env` (using notepad or VS Code) to set your DB credentials:
   ```env
   DB_DATABASE=findit_uiu
   DB_USERNAME=root
   DB_PASSWORD=
   ```

4. **Start the Backend:**
   ```cmd
   php artisan serve
   ```
   Keep the backend running at `http://localhost:8000`.

5. **Start the Frontend:**
   Open the `frontend` folder in VS Code and use the "Live Server" extension to serve the HTML pages.
   Recommended URL: `http://127.0.0.1:5500/frontend/pages/index.html`

## Setup on Linux or macOS (Terminal)

1. **Clone the project:**
   ```bash
   git clone https://github.com/litch07/findit-uiu.git
   cd findit-uiu
   ```

2. **Database Setup:**
   ```bash
   mysql -u root < database/schema.sql
   mysql -u root findit_uiu < database/seed.sql
   ```

3. **Backend Setup:**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan storage:link
   ```
   Edit `.env` (using nano or vim):
   ```bash
   nano .env
   ```
   Set your DB credentials accordingly.

4. **Start the Backend:**
   ```bash
   php artisan serve
   ```
   Keep the backend running at `http://localhost:8000`.

5. **Start the Frontend:**
   Open the frontend with a local static server or VS Code Live Server.
   Recommended URL: `http://127.0.0.1:5500/frontend/pages/index.html`

## Environment Setup

Ensure these crucial values in your `backend/.env` are correctly set:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=findit_uiu
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5500,localhost:5500

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your_email@gmail.com
MAIL_FROM_NAME="FindIt UIU"
```

## Test Accounts

The `seed.sql` file creates these accounts automatically:
```text
Admin:
Email: findituiu@gmail.com
Password: admin123

Students:
Email: sahmed2330154@bscse.uiu.ac.bd
Password: password123

Email: mprodhan2330411@bscse.uiu.ac.bd
Password: password123

Email: mnur2230442@bscse.uiu.ac.bd
Password: password123
```

## Documentation

- API guide: `docs/API.md`
- Database schema: `database/schema.sql`
- Seed data: `database/seed.sql`

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.
