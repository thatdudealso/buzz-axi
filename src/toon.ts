import { encode } from "@toon-format/toon";

export type FieldDef =
  | { type: "field"; key: string; as?: string }
  | { type: "pluck"; key: string; subkey: string; as?: string }
  | {
      type: "joinArray";
      key: string;
      subkey: string;
      as?: string;
      empty?: string;
    }
  | { type: "relativeTime"; key: string; as?: string }
  | { type: "boolYesNo"; key: string; as?: string }
  | { type: "truncate"; key: string; as?: string; limit?: number }
  | {
      type: "custom";
      as: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- polymorphic extractors
      fn: (item: any) => unknown;
    };

export function field(key: string, as?: string): FieldDef {
  return { type: "field", key, as };
}
export function pluck(key: string, subkey: string, as?: string): FieldDef {
  return { type: "pluck", key, subkey, as };
}
export function joinArray(
  key: string,
  subkey: string,
  as?: string,
  empty = "none",
): FieldDef {
  return { type: "joinArray", key, subkey, as, empty };
}
export function relativeTime(key: string, as?: string): FieldDef {
  return { type: "relativeTime", key, as };
}
export function boolYesNo(key: string, as?: string): FieldDef {
  return { type: "boolYesNo", key, as };
}
export function truncate(key: string, as?: string, limit = 500): FieldDef {
  return { type: "truncate", key, as, limit };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- polymorphic extractors
export function custom(as: string, fn: (item: any) => unknown): FieldDef {
  return { type: "custom", as, fn };
}

export function extract(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-parsed objects
  item: Record<string, any>,
  schema: FieldDef[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const def of schema) {
    const outputKey = def.as ?? ("key" in def ? def.key : def.as);
    switch (def.type) {
      case "field":
        result[outputKey] = item[def.key] ?? null;
        break;
      case "pluck":
        result[outputKey] =
          (item[def.key] as Record<string, unknown> | undefined)?.[
            def.subkey
          ] ?? null;
        break;
      case "joinArray": {
        const arr = item[def.key];
        if (Array.isArray(arr) && arr.length > 0) {
          result[outputKey] = arr
            .map((x: unknown) =>
              typeof x === "string"
                ? x
                : (x as Record<string, unknown>)[def.subkey],
            )
            .join(",");
        } else {
          result[outputKey] = def.empty ?? "none";
        }
        break;
      }
      case "relativeTime":
        result[outputKey] = formatRelativeTime(
          item[def.key] as string | number | null | undefined,
        );
        break;
      case "boolYesNo":
        result[outputKey] = item[def.key] ? "yes" : "no";
        break;
      case "truncate": {
        const raw = item[def.key];
        const text =
          typeof raw === "string" ? raw : raw == null ? "" : String(raw);
        const limit = def.limit ?? 500;
        if (text.length <= limit) {
          result[outputKey] = text;
        } else {
          result[outputKey] =
            `${text.slice(0, limit)}\n    ... (truncated, ${text.length} chars total)`;
          result[`${outputKey}_truncated`] = true;
          result[`${outputKey}_total`] = text.length;
        }
        break;
      }
      case "custom":
        result[outputKey] = def.fn(item);
        break;
      default: {
        const _exhaustive: never = def;
        throw new Error(
          `Unknown field type: ${(_exhaustive as FieldDef).type}`,
        );
      }
    }
  }
  return result;
}

export function renderList(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-parsed objects
  items: Record<string, any>[],
  schema: FieldDef[],
): string {
  const extracted = items.map((item) => extract(item, schema));
  return encode({ [label]: extracted });
}

export function renderDetail(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-parsed objects
  item: Record<string, any>,
  schema: FieldDef[],
): string {
  return encode({ [label]: extract(item, schema) });
}

export function renderHelp(lines: string[]): string {
  if (lines.length === 0) return "";
  const indented = lines.map((l) => `  ${l}`).join("\n");
  return `help[${lines.length}]:\n${indented}`;
}

export function renderError(
  message: string,
  code: string,
  suggestions: string[] = [],
): string {
  const blocks = [encode({ error: message, code })];
  if (suggestions.length > 0) blocks.push(renderHelp(suggestions));
  return blocks.join("\n");
}

export function renderOutput(blocks: string[]): string {
  return blocks.filter(Boolean).join("\n");
}

export function renderEmpty(label: string, context: string): string {
  return `${label}: 0 ${context}`;
}

export function encodeObject(value: Record<string, unknown>): string {
  return encode(value);
}

function formatRelativeTime(value: string | number | null | undefined): string {
  if (value == null || value === "") return "unknown";
  const then =
    typeof value === "number"
      ? value < 1e12
        ? value * 1000
        : value
      : new Date(value).getTime();
  if (isNaN(then)) return "unknown";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `${diffMon}mo ago`;
  return `${Math.floor(diffMon / 12)}y ago`;
}
