# Project agent memory

## Architecture

- `axi-sdk-js` `runAxiCli` owns dispatch, `--help`, `-v`, and built-in `update`.
- `src/buzz.ts` is the only `execFile("buzz", …)` boundary. Tests mock `node:child_process` or `src/buzz.js`.
- Credentials stay in `process.env` (`BUZZ_PRIVATE_KEY`). Never add `--private-key` forwarding.
- TOON rendering stays in `src/toon.ts` at the output boundary; internals use JSON.
- Trust allowlist: `src/trust.ts` + `src/provenance.ts` on every content read path.
- Mutations call `requireAsMatch` (`src/identity.ts`) which resolves identity via `buzz users get`.

## Commands

Domain handlers live in `src/commands/`. Shared subcommand dispatch + unknown-flag rejection: `src/dispatch.ts`.

Out of scope vs raw buzz-cli: `social`, `notes`, `mem`, destructive moderation, agent draft/archive writes, relay admin.

## Skill

`skills/buzz-axi/SKILL.md` is generated. Run `pnpm run build:skill` after changing `src/cli-meta.ts` or `src/skill.ts`. CI must run `pnpm run build:skill -- --check`.

## Release boundary

Do not npm publish or open the `kunchenguid/axi` catalog PR from this product workstream until delivery is green and intentionally released. Catalog work belongs in `thatdudealso/buzz-catalog-axi`.
