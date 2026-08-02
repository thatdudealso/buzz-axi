---
name: buzz-axi
description: "Operate Block Buzz through the buzz-axi CLI - channels, messages, threads, mentions, search, DMs, workflows, git reviews, agents archive, audit, files, and trust allowlists. Use whenever a task touches Buzz or buzz-cli: reading channels, sending messages with --as, pinning trusted npubs, or managing workflows."
user-invocable: false
author: thatdudealso
metadata:
  hermes:
    tags: [buzz, nostr, messaging, workflows, git]
    category: communication
---

# buzz-axi

Agent ergonomic wrapper around Buzz CLI. Prefer this over raw `buzz` for Block Buzz operations.

You do not need buzz-axi installed globally - invoke it with `npx -y buzz-axi <command>`.
If buzz-axi output shows a follow-up command starting with `buzz-axi`, run it as `npx -y buzz-axi ...` instead.

buzz-axi requires the [`buzz`](https://github.com/block/buzz) CLI on PATH and `BUZZ_PRIVATE_KEY` in the environment (hex or nsec). Never pass private keys as flags. Optionally set `BUZZ_RELAY_URL` or use `--profile` / `BUZZ_AXI_PROFILE` to select one relay.

## When to use

Use buzz-axi for Block Buzz: channels, messages/threads/mentions/search, DMs, workflows, NIP-34 repos/patches/PRs/issues, read-only agent archive snapshots, read-only moderation audit views, file upload metadata, and the trusted-npub allowlist.

## Workflow

1. Run `npx -y buzz-axi` with no arguments for the home dashboard.
2. Run `npx -y buzz-axi doctor` and `npx -y buzz-axi whoami` to verify setup.
3. Read content with `channels`, `messages`, `mentions`, `search`, `dms`, `workflows`, `repos`, `patches`, `pr`, `issues`, `agents archived`, `audit`.
4. Every mutation requires `--as <npub>` matching the loaded identity.
5. Pin authors with `trust pin <npub>` (preview) then `--confirm` to write `~/.config/buzz-axi/trusted.toml`.
6. Content reads include a `trust: trusted|untrusted|unknown` envelope.
7. Media downloads require `files media <input> --output <path>` — never dump binary into TOON.
8. Install ambient session hooks with `npx -y buzz-axi setup hooks`.

## Commands

```
commands[19]:
  (none)=home, doctor, whoami, channels, messages, mentions, search, dms, workflows, repos, patches, pr, issues, agents, audit, files, trust, init, pack, setup
```

Installed copies also inherit the SDK built-in `update` command.
Run `buzz-axi update --check` to compare the installed version with npm, or `buzz-axi update` to upgrade.
When using `npx -y buzz-axi`, npx already resolves the package on demand.

Run `npx -y buzz-axi --help` for global flags, or `npx -y buzz-axi <command> --help` for per-command usage.

## Tips

- Output is TOON-encoded and token-efficient.
- Kind filters are pass-through only; omit them to use buzz-cli defaults.
- One relay per invocation — profiles never fan out.
- `trust pin` is a preview until `--confirm`; workflow approve is noninteractive and reversible.
- Destructive moderation, relay admin, key export, and shell/file editing are out of scope.
