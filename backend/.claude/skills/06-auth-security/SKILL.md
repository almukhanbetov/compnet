# Authentication and Security
Scope:
- register/login
- access and refresh tokens
- refresh rotation
- logout
- current user
- RBAC

Rules:
- bcrypt or Argon2id password hashes.
- Store only hashed refresh tokens.
- Short access token, long refresh token.
- Validate signing algorithm and expiry.
- Auth middleware reads user id/role into typed context.
- Role middleware protects admin routes.
- Normalize email/phone.
- Avoid user enumeration.
- Restrict CORS to configured frontend origins.
- Never return hashes, secrets or internal auth errors.
