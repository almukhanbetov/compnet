# COMPNET Domain Schema
Initial modules:
- users and profiles
- refresh tokens
- project requests
- project estimate snapshots
- services and pricing
- portfolio
- testimonials/comments
- conversations/messages
- notifications
- SEO pages
- admin audit logs

Suggested tables:
`users`, `user_profiles`, `refresh_tokens`, `project_requests`,
`project_request_features`, `project_estimates`, `services`,
`pricing_items`, `portfolio_cases`, `testimonials`, `comments`,
`conversations`, `conversation_members`, `messages`,
`notifications`, `seo_pages`, `admin_audit_logs`.

Statuses for project requests:
`new`, `contacted`, `qualified`, `proposal_sent`, `accepted`, `rejected`, `archived`.

Roles:
`client`, `manager`, `admin`, `superadmin`.

Do not create all tables in one migration. Implement by milestone.
