# FindIt UIU Backend

Laravel 11 REST API for the FindIt UIU lost and found portal.

## Run

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan storage:link
php artisan serve
```

On Windows, use `copy .env.example .env` instead of `cp`.

## Checks

```bash
php artisan test
php artisan route:list --path=api
```

The API is documented in `../docs/API.md`.
