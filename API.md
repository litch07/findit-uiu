# FindIt UIU — API Documentation

Base URL: `http://localhost:8000/api`

Every request must include:
Accept: application/json

Protected routes also require:
Authorization: Bearer {token}

Tokens are issued by the login endpoint and stored 
in localStorage as the `token` field inside the 
`findit_user` object.

Standard response format:
```json
// Success
{
  "success": true,
  "data": {},
  "message": "..."
}

// Error
{
  "success": false,
  "message": "...",
  "errors": {}
}
```

---

## 🌍 Public Endpoints
*No authentication required*

All routes accessible without a token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Return a simple status ok response to verify the API is running |
| `GET` | `/api/stats` | Retrieve public statistics about active posts, users, and resolution rates |
| `POST` | `/api/contact` | Submit a contact message form that sends an email to the administrators |
| `POST` | `/api/auth/login` | Authenticate with email and password and receive a Sanctum token |
| `POST` | `/api/auth/register` | Register a new student account and trigger an email verification link |
| `GET` | `/api/auth/verify-email/{token}` | Verify a newly registered email address using the token and redirect to the frontend |
| `POST` | `/api/auth/resend-verification` | Resend the email verification link to a registered but unverified email address |
| `POST` | `/api/auth/forgot-password` | Request a password reset link to be sent to a verified email address |
| `POST` | `/api/auth/reset-password` | Reset a user's password using the token sent to their email |

---

## 🔒 Authenticated Endpoints
*Requires valid Bearer token — any role*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/logout` | Revoke the current access token and end the user session |
| `GET` | `/api/auth/me` | Retrieve the authenticated user's profile and usage statistics |
| `PATCH` | `/api/auth/profile` | Update the authenticated user's profile information such as name and bio |
| `PATCH` | `/api/auth/password` | Change the authenticated user's account password |
| `POST` | `/api/auth/profile/photo` | Upload and set a new profile picture for the authenticated user |
| `GET` | `/api/users/{user}` | Retrieve public profile information and active items for a specific user |
| `GET` | `/api/notifications` | Retrieve a paginated list of notifications for the authenticated user |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications for the authenticated user as read |
| `PATCH` | `/api/notifications/{id}` | Mark a specific notification as read |
| `GET` | `/api/messages/unread-count` | Get the total count of unread messages across all conversations |
| `GET` | `/api/conversations` | Retrieve a list of all private message conversations involving the authenticated user |
| `POST` | `/api/conversations` | Start a new conversation or retrieve an existing one with another user |
| `GET` | `/api/conversations/{id}` | Retrieve all messages in a specific conversation and mark them as read |
| `POST` | `/api/conversations/{id}` | Send a new text or image message within a specific private conversation |

---

## 🎓 Student Endpoints
*Requires authentication and `student` role*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/my-items` | Retrieve a paginated list of all item reports created by the authenticated user |
| `GET` | `/api/items` | Retrieve a paginated and filterable list of approved active item reports |
| `POST` | `/api/items` | Submit a new lost or found item report for admin approval |
| `GET` | `/api/items/{item}` | Retrieve detailed information about a specific public item report |
| `PUT/PATCH` | `/api/items/{item}` | Edit the content or resolve the status of an item report created by the authenticated user |
| `DELETE` | `/api/items/{item}` | Delete an item report created by the authenticated user |
| `GET` | `/api/my-claims` | Retrieve lists of both claims submitted by and claims received by the authenticated user |
| `GET` | `/api/claims` | Retrieve a list of all claims relevant to the authenticated user |
| `POST` | `/api/claims` | Submit a new claim for an active item report |
| `GET` | `/api/claims/{claim}` | Retrieve detailed information about a specific claim |
| `PUT/PATCH` | `/api/claims/{claim}` | Accept or reject a received claim for the user's item report |
| `DELETE` | `/api/claims/{claim}` | Cancel a pending claim submitted by the authenticated user |

---

## 🛡️ Admin Endpoints
*Requires authentication and `admin` role*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Retrieve detailed system statistics and recent activity logs for the admin dashboard |
| `GET` | `/api/admin/pending` | Retrieve a paginated list of item reports awaiting admin approval |
| `GET` | `/api/admin/items` | Retrieve a comprehensive and filterable list of all items regardless of approval status |
| `GET` | `/api/admin/items/{item}` | Retrieve detailed information about a specific item report for administrative review |
| `PATCH` | `/api/admin/items/{item}` | Approve, reject, or manually update the status of a specific item report |
| `DELETE` | `/api/admin/items/{item}` | Delete any item report from the system as an administrator |
| `GET` | `/api/admin/users` | Retrieve a paginated and filterable list of all user accounts |
| `GET` | `/api/admin/users/{user}` | Retrieve detailed profile information and activity logs for a specific user |
| `PATCH` | `/api/admin/users/{user}/ban` | Ban a student account and prevent future logins |
| `PATCH` | `/api/admin/users/{user}/unban` | Unban a suspended student account and restore login access |
| `GET` | `/api/admin/logs` | Retrieve a paginated list of all administrative actions and system logs |
| `GET` | `/api/admin/export/users` | Export a comprehensive list of all users and their statuses as a CSV file |
| `GET` | `/api/admin/export/logs` | Export the administrative activity logs as a CSV file |
| `GET` | `/api/admin/export/items` | Export a list of all item reports as a CSV file |

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 401 | Unauthenticated — token missing or invalid |
| 403 | Forbidden — wrong role or banned account |
| 404 | Resource not found |
| 422 | Validation failed — check errors field |
| 500 | Server error — check Laravel logs |

---

## Authentication Flow

1. Call POST `/api/auth/login` with email and password
2. Save the returned token from `data.token`
3. Include it in all subsequent requests:
   `Authorization: Bearer {your_token}`
4. To end the session call POST `/api/auth/logout`
