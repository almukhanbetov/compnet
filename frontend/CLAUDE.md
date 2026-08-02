# COMPNET — Claude Code Project Instructions

## Project goal
Build COMPNET as a modern, wide-screen AI/IT themed commerce platform.

## Current phase
Phase 1 (visual frontend prototype) — complete: homepage, services, pricing + calculator, portfolio + case pages, contact form, legal pages, chat prototype.

Phase 2 (real backend) — authorized to begin, but not started yet. Do not write backend code, provision infrastructure, or wire up real persistence/auth/WebSocket connections until a dedicated Phase 2 planning pass has happened and been confirmed: stack choice, hosting, database schema, auth strategy, deployment target. The "Phase 2 stack" list below is the expected direction, not a green light to implement ad hoc the next time a "real-time" or "real backend" feature is requested — always plan first, same as every Phase 1 stage was planned before implementation.

## Allowed stack (frontend, Phase 1)
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Motion for React
- Swiper
- Recharts

## Phase 2 stack (planned direction, not yet implemented)
- PostgreSQL
- Go Gin API
- Next.js API routes (only if the confirmed plan calls for them)
- Redis
- WebSocket server
- real authentication
- real payments
- real file uploads
- Docker (for backend services)

## Architecture rules
- Keep route files small.
- Place reusable components in `components/` outside `app/`.
- Use `@/components/...` imports.
- Use typed mock data from `data/`.
- Never use `any`.
- Prefer server components by default.
- Add `"use client"` only where interactivity requires it.
- Use `next/image` for local images.
- Ensure desktop, tablet and mobile layouts.
- Keep design visually rich but not overloaded.

## Design direction
- Deep navy/graphite background
- Violet, blue and cyan accents
- Soft glow, grid and glassmorphism
- Wide sections with max-width around 1280–1440px
- Large typography
- Rounded cards
- Subtle animation
- High contrast and accessible states

## Color tokens
- background: `#070B17`
- surface: `#10172A`
- surfaceLight: `#17213A`
- primary: `#7C3AED`
- secondary: `#2563EB`
- accent: `#06B6D4`
- pink: `#EC4899`
- text: `#F8FAFC`
- muted: `#94A3B8`

## Work sequence
1. Inspect current project.
2. Fix folder structure if needed.
3. Build shared layout.
4. Build Header.
5. Build Hero.
6. Build homepage sections one by one.
7. Verify in browser after each section.
8. Only after homepage approval, continue to catalog and profile.

## Output discipline
Before large changes, show:
1. files to be changed;
2. planned component structure;
3. risks or conflicts in current code.

After changes, report:
1. changed files;
2. how to run;
3. what to verify in browser.
