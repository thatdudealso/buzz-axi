#!/usr/bin/env node
import { AxiError, exitCodeForError } from "axi-sdk-js";
import { main } from "../src/cli.js";
import { renderError } from "../src/toon.js";

main().catch((error: unknown) => {
  if (error instanceof AxiError) {
    process.stdout.write(
      `${renderError(error.message, error.code, error.suggestions)}\n`,
    );
    process.exitCode = exitCodeForError(error);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(`${renderError(message, "UNKNOWN")}\n`);
  process.exitCode = 1;
});
