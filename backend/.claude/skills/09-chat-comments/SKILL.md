# Chat, Comments and Moderation
Chat starts with HTTP polling, not WebSocket.

Chat endpoints:
```text
POST /api/v1/conversations
GET  /api/v1/conversations
GET  /api/v1/conversations/:id/messages
POST /api/v1/conversations/:id/messages
PATCH /api/v1/conversations/:id/read
```

Comments:
- statuses: pending, approved, rejected, hidden
- public returns only approved
- admin moderation records moderator and reason
- limit length and thread depth
- no raw HTML
- verify conversation membership on every chat query
- user id comes from auth context, not request body
