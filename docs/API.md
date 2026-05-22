# FindIt UIU API Guide

Base URL: `http://localhost:8000/api`

Authenticated requests use:

```http
Authorization: Bearer <token>
Accept: application/json
```

Common response format:

```json
{ "success": true, "data": {}, "message": "Done." }
```

## 50% Milestone Endpoints

| Area | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| Health | GET | `/health` | Check API status |
| Stats | GET | `/stats` | Landing page counters |
| Auth | POST | `/auth/register` | Create student account |
| Auth | POST | `/auth/login` | Login and receive token |
| Auth | POST | `/auth/logout` | Logout current token |
| Auth | GET | `/auth/me` | Current user profile |
| Auth | PATCH | `/auth/profile` | Update profile details |
| Items | GET | `/items` | Browse approved lost/found posts |
| Items | POST | `/items` | Create lost/found report |
| Items | GET | `/items/{id}` | View report details |
| Items | PATCH | `/items/{id}` | Update own report details |
| Items | GET | `/my-items` | Current user's reports |
| Claims | GET | `/my-claims` | Submitted claims and claims on my posts |
| Claims | POST | `/claims` | Submit owner claim or found report |
| Claims | PATCH | `/claims/{id}` | Accept or reject claim |
| Messages | GET | `/conversations` | List conversations |
| Messages | POST | `/conversations` | Start conversation |
| Messages | GET | `/conversations/{id}` | Conversation with messages |
| Messages | POST | `/conversations/{id}` | Send text message |
| Notifications | GET | `/notifications?per_page=12&page=1` | Paginated notifications |
| Notifications | PATCH | `/notifications/{id}` | Mark one as read |
| Notifications | PATCH | `/notifications/read-all` | Mark all as read |
| Admin | GET | `/admin/stats` | Admin overview counters |
| Admin | GET | `/admin/pending` | Reports waiting for approval |
| Admin | GET | `/admin/items` | Admin report list |
| Admin | GET | `/admin/items/{id}` | Admin report details |
| Admin | PATCH | `/admin/items/{id}` | Approve, close, or update report |

## Important Request Examples

Login:

```json
{
  "email": "findituiu@gmail.com",
  "password": "admin123"
}
```

Create report:

```json
{
  "type": "lost",
  "title": "Samsung Galaxy Phone",
  "description": "Black Samsung phone with a matte case.",
  "category_id": 1,
  "location": "UIU Library 2nd Floor",
  "lost_found_date": "2026-01-10"
}
```

Submit found report for a lost item:

```json
{
  "item_id": 1,
  "relationship_type": "found_it",
  "proof_text": "Found a matching phone near the library.",
  "message": "Please message me to verify.",
  "preferred_location": "UIU Library",
  "availability": "With me"
}
```

Approve report:

```json
{ "is_approved": true }
```

Close report:

```json
{
  "status": "closed",
  "admin_note": "Duplicate report"
}
```

Send message:

```json
{
  "body": "Can we meet near the office?"
}
```

## Status Flow

```text
awaiting_approval -> active -> claim_in_progress -> resolved
awaiting_approval -> closed
active -> closed
```

## Test Accounts

```text
Admin: findituiu@gmail.com / admin123
Student: sahmed2330154@bscse.uiu.ac.bd / password123
Student: mprodhan2330411@bscse.uiu.ac.bd / password123
Student: mnur2230442@bscse.uiu.ac.bd / password123
```
