import { execFile } from "node:child_process";
import { vi } from "vitest";

export const mockedExecFile = vi.mocked(execFile);

type ExecFileCallback = (
  error: Error | null,
  stdout: string,
  stderr: string,
) => void;

export function mockExecFileResult(
  error: (Error & { code?: string | number }) | null,
  stdout: string,
  stderr: string,
) {
  mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
    (callback as ExecFileCallback)(error, stdout, stderr);
    return {} as ReturnType<typeof execFile>;
  });
}

export function mockExecFileEnoent() {
  mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
    const err = new Error("spawn buzz ENOENT") as Error & { code: string };
    err.code = "ENOENT";
    (callback as ExecFileCallback)(err, "", "");
    return {} as ReturnType<typeof execFile>;
  });
}

export function mockBuzzJsonSequence(
  responses: Array<{ argsMatch?: (args: string[]) => boolean; json: unknown }>,
) {
  let call = 0;
  mockedExecFile.mockImplementation((_cmd, args, _opts, callback) => {
    const entry = responses[call] ?? responses[responses.length - 1];
    call++;
    if (entry.argsMatch && !entry.argsMatch(args as string[])) {
      (callback as ExecFileCallback)(
        Object.assign(new Error("unexpected args"), { code: 1 }),
        "",
        JSON.stringify({ error: "user_error", message: "unexpected args" }),
      );
      return {} as ReturnType<typeof execFile>;
    }
    (callback as ExecFileCallback)(null, JSON.stringify(entry.json), "");
    return {} as ReturnType<typeof execFile>;
  });
}

/** Fixed test key material — never a real secret; used only for npub roundtrips. */
export const TEST_PUBKEY_HEX =
  "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
