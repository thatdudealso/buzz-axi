import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { rejectCredentialFlags } from "./args.js";
import { DESCRIPTION, TOP_HELP } from "./cli-meta.js";
import { resolveContext, type BuzzContext } from "./context.js";
import { agentsCommand, AGENTS_HELP } from "./commands/agents.js";
import { auditCommand, AUDIT_HELP } from "./commands/audit.js";
import { channelsCommand, CHANNELS_HELP } from "./commands/channels.js";
import { dmsCommand, DMS_HELP } from "./commands/dms.js";
import { doctorCommand, DOCTOR_HELP } from "./commands/doctor.js";
import { filesCommand, FILES_HELP } from "./commands/files.js";
import { homeCommand } from "./commands/home.js";
import { initCommand, INIT_HELP } from "./commands/init.js";
import { issuesCommand, ISSUES_HELP } from "./commands/issues.js";
import { mentionsCommand, MENTIONS_HELP } from "./commands/mentions.js";
import { messagesCommand, MESSAGES_HELP } from "./commands/messages.js";
import { packCommand, PACK_HELP } from "./commands/pack.js";
import { patchesCommand, PATCHES_HELP } from "./commands/patches.js";
import { prCommand, PR_HELP } from "./commands/pr.js";
import { reposCommand, REPOS_HELP } from "./commands/repos.js";
import { searchCommand, SEARCH_HELP } from "./commands/search.js";
import { setupCommand, SETUP_HELP } from "./commands/setup.js";
import { trustCommand, TRUST_HELP } from "./commands/trust.js";
import { whoamiCommand, WHOAMI_HELP } from "./commands/whoami.js";
import { workflowsCommand, WORKFLOWS_HELP } from "./commands/workflows.js";

export { DESCRIPTION, TOP_HELP };

const VERSION = readPackageVersion();

type CliStdout = Pick<NodeJS.WriteStream, "write">;

type MainOptions = {
  argv?: string[];
  stdout?: CliStdout;
};

const COMMAND_HELP: Record<string, string> = {
  doctor: DOCTOR_HELP,
  whoami: WHOAMI_HELP,
  channels: CHANNELS_HELP,
  messages: MESSAGES_HELP,
  mentions: MENTIONS_HELP,
  search: SEARCH_HELP,
  dms: DMS_HELP,
  workflows: WORKFLOWS_HELP,
  repos: REPOS_HELP,
  patches: PATCHES_HELP,
  pr: PR_HELP,
  issues: ISSUES_HELP,
  agents: AGENTS_HELP,
  audit: AUDIT_HELP,
  files: FILES_HELP,
  trust: TRUST_HELP,
  init: INIT_HELP,
  pack: PACK_HELP,
  setup: SETUP_HELP,
};

type CommandFn = (args: string[], ctx?: BuzzContext) => Promise<string>;

const COMMANDS: Record<string, CommandFn> = {
  doctor: withContext(doctorCommand),
  whoami: withContext(whoamiCommand),
  channels: withContext(channelsCommand),
  messages: withContext(messagesCommand),
  mentions: withContext(mentionsCommand),
  search: withContext(searchCommand),
  dms: withContext(dmsCommand),
  workflows: withContext(workflowsCommand),
  repos: withContext(reposCommand),
  patches: withContext(patchesCommand),
  pr: withContext(prCommand),
  issues: withContext(issuesCommand),
  agents: withContext(agentsCommand),
  audit: withContext(auditCommand),
  files: withContext(filesCommand),
  trust: withContext(trustCommand),
  init: withContext(initCommand),
  pack: withContext(packCommand),
  setup: setupCommand,
};

export async function main(options: MainOptions = {}): Promise<void> {
  await runAxiCli<BuzzContext | undefined>({
    ...(options.argv ? { argv: options.argv } : {}),
    description: DESCRIPTION,
    version: VERSION,
    topLevelHelp: TOP_HELP,
    ...(options.stdout ? { stdout: options.stdout } : {}),
    home: withContext(homeCommand),
    commands: COMMANDS,
    getCommandHelp: (command) => COMMAND_HELP[command],
    resolveContext: ({ args }) => {
      rejectCredentialFlags(args);
      const { relayFlag, profileFlag, strippedArgs } = parseGlobalArgs(args);
      // Mutate args in place so commands see stripped flags.
      args.length = 0;
      args.push(...strippedArgs);
      return resolveContext({ relayFlag, profileFlag });
    },
  });
}

function withContext(handler: CommandFn): CommandFn {
  return (args, ctx) => {
    rejectCredentialFlags(args);
    return handler(args, ctx);
  };
}

function parseGlobalArgs(args: string[]): {
  relayFlag: string | undefined;
  profileFlag: string | undefined;
  strippedArgs: string[];
} {
  const stripped: string[] = [];
  let relayFlag: string | undefined;
  let profileFlag: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--relay" && i + 1 < args.length) {
      relayFlag = args[++i];
      continue;
    }
    if (arg.startsWith("--relay=") && arg.length > "--relay=".length) {
      relayFlag = arg.slice("--relay=".length);
      continue;
    }
    if ((arg === "--profile" || arg === "-p") && i + 1 < args.length) {
      profileFlag = args[++i];
      continue;
    }
    if (arg.startsWith("--profile=") && arg.length > "--profile=".length) {
      profileFlag = arg.slice("--profile=".length);
      continue;
    }
    stripped.push(arg);
  }

  return { relayFlag, profileFlag, strippedArgs: stripped };
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, "..", "package.json"),
    join(here, "..", "..", "package.json"),
  ]) {
    if (!existsSync(candidate)) continue;
    const parsed = JSON.parse(readFileSync(candidate, "utf-8")) as {
      version?: unknown;
    };
    if (typeof parsed.version === "string" && parsed.version.length > 0) {
      return parsed.version;
    }
  }
  throw new Error("Could not determine buzz-axi package version");
}
