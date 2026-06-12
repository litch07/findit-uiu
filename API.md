# FindIt UIU — API Reference

**Base URL:** `/api`  
**Authentication:** Laravel Sanctum (`Authorization: Bearer <token>`)  
**Content-Type:** `application/json` (unless noted otherwise)

---

## Conventions

| Symbol | Meaning |
|--------|---------|
| `*` | Required field |
| _(Optional)_ | Field is nullable / conditionally present |
| `[Auth]` | Requires `Authorization: Bearer <token>` header |
| `[Role: X]` | Requires authenticated user with role `X` |

All authenticated routes that fail the role check return `403 Forbidden`.  
Validation failures return `422 Unprocessable Entity` with an `errors` object.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Shared — Profile](#2-shared--profile)
3. [Shared — Notifications](#3-shared--notifications)
4. [Student — Items](#4-student--items)
5. [Student — Claims](#5-student--claims)
6. [Student — Messages](#6-student--messages)
7. [Admin](#7-admin)

---

## 1. Authentication

### POST `/auth/register`

Registers a new student account.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `name` * | string | max:100 |
| `email` * | string | email, max:150, unique |
| `password` * | string | min:8, 1 uppercase, 1 number, 1 special char, confirmed |
| `password_confirmation` * | string | — |
| `student_id` * | string | max:20, unique |
| `department` | string | _(Optional)_, max:100 |

**Response `201`**

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "email": "student@bscse.uiu.ac.bd"
}
```

---

### POST `/auth/login`

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `email` * | string | email |
| `password` * | string | — |

**Response `200`**

```json
{
  "success": true,
  "token": "1|abc123...",
  "user": {
    "id": 1,
    "name": "Sadid Ahmed",
    "email": "sahmed@bscse.uiu.ac.bd",
    "role": "student",
    "is_banned": false,
    "email_verified_at": "2026-01-01T00:00:00.000000Z",
    "stats": {
      "total_posts": 2,
      "active_posts": 1,
      "resolved_posts": 0,
      "total_claims": 1,
      "accepted_claims": 1
    }
  }
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `401` | Invalid email or password |
| `401` | Account inactive |
| `403` | Account suspended |
| `403` | Email not verified |

---

### POST `/auth/logout` `[Auth]`

Revokes the current Bearer token.

**Response `200`**

```json
{ "success": true }
```

---

### GET `/auth/me` `[Auth]`

Returns the authenticated user's profile and system statistics.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Sadid Ahmed",
    "email": "sahmed@bscse.uiu.ac.bd",
    "role": "student",
    "stats": { ... }
  }
}
```

---

### POST `/auth/verify-email`

Verifies a user's email address using the token sent on registration.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `email` * | string | email |

**Route Parameter**
`/auth/verify-email/{token}`

**Response `200`**

```json
{
  "success": true,
  "message": "Email verified successfully.",
  "token": "2|xyz456...",
  "user": { ... }
}
```

---

### POST `/auth/forgot-password`

Sends a password reset link to the given email.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `email` * | string | email |

**Response `200`**

```json
{
  "success": true,
  "message": "If that email is associated with a verified account, a password reset link has been sent."
}
```

---

### POST `/auth/reset-password`

Resets password using the token received by email.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `email` * | string | email |
| `token` * | string | — |
| `password` * | string | min:8, confirmed |
| `password_confirmation` * | string | — |

**Response `200`**

```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now sign in."
}
```

---

## 2. Shared — Profile

### PUT `/profile` `[Auth]`

Updates mutable profile fields.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `name` * | string | max:100 |
| `phone` | string | _(Optional)_, max:20 |
| `bio` | string | _(Optional)_ |

**Response `200`**

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": { ... }
}
```

---

### PUT `/profile/password` `[Auth]`

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `current_password` * | string | — |
| `new_password` * | string | min:8, confirmed |
| `new_password_confirmation` * | string | — |

**Response `200`**

```json
{
  "success": true,
  "message": "Password updated. Please sign in again."
}
```

---

### POST `/profile/photo` `[Auth]`

Uploads or replaces the user avatar.

**Request** (`multipart/form-data`)

| Field | Type | Rules |
|-------|------|-------|
| `photo` * | file | image (jpeg, png, webp), max 2048 KB |

**Response `200`**

```json
{
  "success": true,
  "message": "Profile photo updated",
  "data": { "avatar_url": "/storage/avatars/user_1_12345.jpg" }
}
```

---

## 3. Shared — Notifications

### GET `/notifications` `[Auth]`

Returns the paginated list of notifications.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `unread` | boolean | _(Optional)_, filter only unread |
| `per_page` | integer | _(Optional)_, default 20 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "type": "message",
        "title": "New Message",
        "message": "Sadid Ahmed sent you a message.",
        "is_read": false,
        "related_item_id": 1,
        "created_at": "2026-01-01T12:00:00Z"
      }
    ]
  },
  "meta": { "unread_count": 3 }
}
```

---

### POST `/notifications/{id}/read` `[Auth]`

Marks a specific notification as read.

**Response `200`**

```json
{ "success": true, "message": "Notification marked as read." }
```

---

### POST `/notifications/read-all` `[Auth]`

Marks all notifications as read.

**Response `200`**

```json
{ "success": true, "message": "Notifications marked as read." }
```

---

## 4. Student — Items

### GET `/items`

Lists all approved public items. Unauthenticated access permitted.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | _(Optional)_, `lost` or `found` |
| `category` | string | _(Optional)_, filter by category name |
| `location` | string | _(Optional)_, partial match location |
| `q` | string | _(Optional)_, search title, description |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "title": "Samsung Galaxy Phone",
        "type": "lost",
        "status": "active",
        "location": "UIU Library",
        "category": { "id": 1, "name": "Electronics" }
      }
    ],
    "current_page": 1,
    "last_page": 1
  }
}
```

---

### POST `/items` `[Auth]` `[Role: student]`

Submits a new lost or found report.

**Request** (`multipart/form-data`)

| Field | Type | Rules |
|-------|------|-------|
| `type` * | string | `lost`, `found` |
| `title` * | string | max:150 |
| `description` * | string | min:20, max:1000 |
| `category_id` * | integer | exists in categories |
| `location` * | string | max:100 |
| `specific_spot` | string | _(Optional)_, max:150 |
| `lost_found_date` * | string | date, format `YYYY-MM-DD` |
| `lost_found_time` * | string | format `HH:MM` |
| `color` | string | _(Optional)_, max:50 |
| `brand_model` | string | _(Optional)_, max:100 |
| `current_location` | string | _(Optional)_, required if type is `found` |
| `tags` | string | _(Optional)_, comma-separated keywords |
| `images[]` | file[] | _(Optional)_, jpeg/png/webp, max 5MB, max 3 files |

**Response `201`**

```json
{
  "success": true,
  "message": "Report submitted successfully and is awaiting admin approval.",
  "data": { "id": 1, "status": "awaiting_approval" }
}
```

---

### GET `/items/{id}` `[Auth]` `[Role: student]`

Retrieves full details of a specific item.

**Response `200`**

```json
{
  "success": true,
  "data": { ... }
}
```

---

### POST `/scam-reports` `[Auth]` `[Role: student]`

Reports a resolved item for bad faith/scam behavior.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `item_id` * | integer | exists in items, must be resolved |
| `description` * | string | min:30, max:500 |

**Response `200`**

```json
{ "success": true, "message": "Your report has been submitted to the admin." }
```

---

## 5. Student — Claims

### POST `/claims` `[Auth]` `[Role: student]`

Submits a claim for an active item.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `item_id` * | integer | exists in items (must be active status) |
| `relationship_type` * | string | `owner`, `finder`, `behalf`, `found_it` |
| `proof_text` * | string | min:20, max:1000 |
| `message` * | string | min:10, max:500 |
| `preferred_location` *| string | max:255 |
| `availability` * | string | max:255 |

**Response `201`**

```json
{
  "success": true,
  "message": "Your claim has been submitted to the poster.",
  "data": { "id": 1, "status": "pending" }
}
```

---

### POST `/claims/{id}/respond` `[Auth]` `[Role: student]`

Accepts or rejects a pending claim on the user's item. If accepted, auto-starts a conversation.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `action` * | string | `accept`, `reject` |

**Response `200`**

```json
{
  "success": true,
  "message": "Claim accepted successfully. A conversation has been started.",
  "conversation_id": 1
}
```

---

## 6. Student — Messages

### GET `/messages/conversations` `[Auth]` `[Role: student]`

Lists all active conversations for the user.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "item": { "title": "Black Wallet", "status": "claim_in_progress" },
      "other_user": { "name": "Jane Doe", "avatar_url": null },
      "unread_count": 1
    }
  ]
}
```

---

### GET `/messages/conversations/{id}` `[Auth]` `[Role: student]`

Fetches all messages in a specific conversation and marks them as read.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "conversation": { ... },
    "messages": [
      {
        "id": 1,
        "sender_id": 2,
        "body": "Hello, I found your wallet.",
        "is_read": true,
        "created_at": "2026-01-01T12:00:00Z"
      }
    ]
  }
}
```

---

### POST `/messages/conversations/{id}` `[Auth]` `[Role: student]`

Sends a message to an active conversation.

**Request** (`multipart/form-data`)

| Field | Type | Rules |
|-------|------|-------|
| `body` | string | required if no image, max:2000 |
| `image` | file | required if no body, max:5120 KB, jpeg/png/webp/gif |

**Response `201`**

```json
{
  "success": true,
  "data": { "id": 2, "body": "Thank you!", "is_read": false }
}
```

---

## 7. Admin

All routes under `/admin/*` require `[Auth]` and `[Role: admin]`.

---

### GET `/admin/stats`

Returns platform statistics, counts, and recent activity.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "total_items": 120,
    "pending_items": 5,
    "active_items": 100,
    "total_users": 250,
    "recent_activity": [ ... ]
  }
}
```

---

### GET `/admin/items`

Retrieves all items regardless of approval status. Includes robust filtering and legacy reference ID search.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | _(Optional)_ |
| `status` | string | _(Optional)_ |
| `approved` | boolean | _(Optional)_ |
| `search` / `q`| string | _(Optional)_, searches title, desc, user info, legacy ID |

**Response `200`**

```json
{
  "success": true,
  "data": { "data": [ ... ], "current_page": 1 }
}
```

---

### PATCH `/admin/items/{id}`

Updates item approval or system status.

**Request Body**

| Field | Type | Rules |
|-------|------|-------|
| `is_approved` | boolean | _(Optional)_ |
| `status` | string | _(Optional)_, `active`, `resolved`, etc. |
| `admin_note` | string | _(Optional)_ |

**Response `200`**

```json
{
  "success": true,
  "data": { "id": 1, "is_approved": true, "status": "active" }
}
```

---

### DELETE `/admin/items/{id}`

Hard-deletes an item from the system. Logs action in `admin_logs`.

**Response `200`**

```json
{ "success": true }
```

---

### GET `/admin/users/{id}`

Fetches full user profile details including item/claim history for moderation.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "John Doe",
    "is_banned": false,
    "items": [ ... ],
    "claims": [ ... ]
  }
}
```

---

### POST `/admin/users/{id}/ban`

Bans a user from accessing the platform.

**Response `200`**

```json
{ "success": true }
```

---

### POST `/admin/users/{id}/unban`

Unbans a user.

**Response `200`**

```json
{ "success": true }
```

---

### GET `/admin/logs`

Retrieves paginated admin moderation logs.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `action` | string | _(Optional)_ |
| `q` | string | _(Optional)_ |

**Response `200`**

```json
{
  "success": true,
  "data": { "data": [ ... ] }
}
```
