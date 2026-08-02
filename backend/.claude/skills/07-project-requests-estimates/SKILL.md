# Project Requests and Estimates
Endpoints:
```text
POST /api/v1/project-requests
GET  /api/v1/project-requests/:id
GET  /api/v1/admin/project-requests
GET  /api/v1/admin/project-requests/:id
PATCH /api/v1/admin/project-requests/:id/status
```

Input:
name, phone, email, company, project_type, description,
budget_range, desired_timeline, contact_method, consent,
calculator selections and client estimate.

Rules:
- Require consent and at least phone or email.
- Server recomputes estimate; never trust frontend totals.
- Store pricing-rule version and calculator input snapshot.
- Store money as integer tenge.
- Status changes create audit log records.
- Return request id, status, server estimate and created_at.
