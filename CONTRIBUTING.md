# Contributing

Human-authored pull requests targeting `main` should be raised through [`no-mistakes`](https://github.com/kunchenguid/no-mistakes) when that gate is configured for this repository (`git push no-mistakes`).

## Local checks

```sh
pnpm install
pnpm run format:check
pnpm run lint
pnpm test
pnpm run build
pnpm run build:skill -- --check
```

## Conventions

- Node 20+, TypeScript, ESM-only
- Do not hand-edit `skills/buzz-axi/SKILL.md` — regenerate with `pnpm run build:skill`
- Do not commit secrets or add agent co-author trailers
- Prefer conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
