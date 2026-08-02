export const DESCRIPTION =
  "Agent ergonomic wrapper around Buzz CLI. Prefer this over raw `buzz` for Block Buzz operations.";

export const TOP_HELP = `usage: buzz-axi [command] [args] [flags]
commands[19]:
  (none)=home, doctor, whoami, channels, messages, mentions, search, dms, workflows, repos, patches, pr, issues, agents, audit, files, trust, init, pack, setup
flags[4]:
  --relay <url> (after command), --profile/-p <name> (after command) or BUZZ_AXI_PROFILE env, --help, -v/-V/--version
examples:
  buzz-axi
  buzz-axi doctor
  buzz-axi whoami
  buzz-axi channels list --member
  buzz-axi messages get --channel <uuid>
  buzz-axi trust pin <npub> --confirm
  buzz-axi setup hooks
`;
