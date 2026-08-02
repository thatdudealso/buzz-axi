import { rejectCredentialFlags, rejectUnknownFlags } from "./args.js";
import { AxiError } from "./errors.js";

export type SubcommandHandler = (args: string[]) => Promise<string>;

export interface SubcommandSpec {
  name: string;
  knownFlags: readonly string[];
  /** When true, handler performs its own --as check. */
  mutating?: boolean;
  run: SubcommandHandler;
}

export async function dispatchSubcommands(
  args: string[],
  group: string,
  specs: SubcommandSpec[],
  help: string,
): Promise<string> {
  rejectCredentialFlags(args);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    return help.trimEnd();
  }

  const name = args[0];
  if (name.startsWith("-")) {
    throw new AxiError(
      `Missing subcommand for \`${group}\``,
      "VALIDATION_ERROR",
      [`Run \`buzz-axi ${group} --help\``],
    );
  }

  const spec = specs.find((s) => s.name === name);
  if (!spec) {
    const names = specs.map((s) => s.name).join(", ");
    throw new AxiError(
      `Unknown ${group} subcommand: ${name}`,
      "VALIDATION_ERROR",
      [`Valid subcommands: ${names}`, `Run \`buzz-axi ${group} --help\``],
    );
  }

  const rest = args.slice(1);
  if (rest.includes("--help") || rest.includes("-h")) {
    return help.trimEnd();
  }

  rejectCredentialFlags(rest);
  rejectUnknownFlags(rest, spec.knownFlags, `${group} ${spec.name}`);
  return spec.run(rest);
}
