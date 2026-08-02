# Skill: Frontend Architecture

## Goal
Create a clean Next.js App Router architecture for a visual prototype.

## Preferred structure
```text
frontend/
├── app/
├── components/
│   ├── layout/
│   ├── home/
│   ├── catalog/
│   ├── profile/
│   ├── chat/
│   ├── reviews/
│   ├── admin/
│   └── ui/
├── data/
├── types/
├── lib/
└── public/
```

If the project uses `src/`, place these folders under `src/`.

## Rules
- `app/` contains routes and route-specific composition.
- Reusable components must stay outside `app/`.
- Keep `page.tsx` under 120 lines when possible.
- Split sections into separate components.
- Create shared types before duplicating object shapes.
- Use absolute imports via `@/`.
- Do not create barrel files unless they improve clarity.
