# Optional real-relay tests

These tests are excluded from the default `pnpm test` suite.

Enable with a live `buzz-relay` (see `buzz-cli` TESTING.md) and:

```sh
pnpm run test:relay
```

Requires `BUZZ_PRIVATE_KEY` and `BUZZ_RELAY_URL`.
