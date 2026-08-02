# Skill: Browser Debugger

## Use when there is an error or screenshot
1. Read the exact error.
2. Identify whether it is path, import, TypeScript, Tailwind or runtime related.
3. Fix the smallest root cause.
4. Do not rewrite unrelated files.
5. Re-run lint or build when appropriate.

## Common COMPNET issue
Reusable components should be in:
- `src/components/...` when the project uses `src/`
- `components/...` when it does not

Then import with:
```ts
import Header from "@/components/layout/Header";
```
