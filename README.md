# buzz-axi

Agent-ergonomic CLI for [Block Buzz](https://github.com/block/buzz), built to the [AXI](https://github.com/kunchenguid/axi) standard.

`buzz-axi` shells out to `buzz` (`buzz-cli`), consumes its JSON, and renders [TOON](https://toonformat.dev/) at the output boundary. It does not link the Rust SDK or reimplement Nostr signing.

Upstream proposal: [kunchenguid/axi#121](https://github.com/kunchenguid/axi/issues/121)

## Requirements

- Node.js ≥ 20
- [`buzz`](https://github.com/block/buzz) on `PATH`
- `BUZZ_PRIVATE_KEY` in the environment (hex or nsec) — **never** as a flag
- Optional: `BUZZ_RELAY_URL` (default `http://localhost:3000`)

## Quick start

```sh
pnpm install
pnpm run build
pnpm link --global   # or: node dist/bin/buzz-axi.js

export BUZZ_PRIVATE_KEY=...   # do not echo this
buzz-axi doctor
buzz-axi whoami
buzz-axi
```

## Relay profiles

Use `buzz-axi init config` to create `~/.config/buzz-axi/profiles.toml`, then define a named relay:

```toml
[profiles.dev]
relay = "http://localhost:3000"
```

Select it with `buzz-axi --profile dev` or `BUZZ_AXI_PROFILE=dev`. Each invocation uses exactly one relay; an explicit `--relay <url>` takes precedence over a profile.

After publish (not done in this delivery):

```sh
npm install -g buzz-axi
```

## Security contract

- **Env-only credentials** — never flags, config files, process-list exposure, or stdout
- **Read-only by default** — every mutation requires `--as <npub|hex>` matching the loaded identity
- **Trust allowlist** at `~/.config/buzz-axi/trusted.toml` with `trust: trusted|untrusted|unknown` on content reads
- **`trust pin`** is a preview until `--confirm` (no interactive prompts)
- **No** relay admin, key export, shell/file editing, or destructive moderation
- **No hardcoded Buzz kinds** — upstream defaults apply unless you pass filters
- **One relay per invocation** — `--profile` / `BUZZ_AXI_PROFILE` selects a single relay
- **Media** downloads require `--output <path>`; binary never enters TOON

## Agent integrations

1. **Session hooks (primary):** `buzz-axi setup hooks` — Claude Code, Codex, OpenCode
2. **Skill (secondary):** `npx skills add thatdudealso/buzz-axi --skill buzz-axi`

## Development

```sh
pnpm install
pnpm run format:check
pnpm run lint
pnpm test
pnpm run build
pnpm run build:skill -- --check
```

Optional real-relay tests (not default CI): `pnpm run test:relay`

## Catalog contribution

The community AXI catalog entry in `kunchenguid/axi` is a separate docs-only PR from `thatdudealso/buzz-catalog-axi`, opened only after a green, releaseable npm publish. This repository is the product; that fork is catalog-only.

## License

MIT
