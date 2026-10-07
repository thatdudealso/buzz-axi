export interface CountLineOptions {
  count: number;
  limit?: number;
  totalCount?: number;
}

export function formatCountLine(opts: CountLineOptions): string {
  const { count, limit, totalCount } = opts;
  if (totalCount !== undefined && totalCount !== null && totalCount >= count) {
    return `count: ${count} of ${totalCount} total`;
  }
  if (limit !== undefined && count === limit && count > 0) {
    return `count: ${count} (showing first ${count})`;
  }
  return `count: ${count}`;
}

export function truncateText(
  text: string,
  limit = 500,
): { text: string; truncated: boolean; total: number } {
  if (text.length <= limit) {
    return { text, truncated: false, total: text.length };
  }
  return {
    text: `${text.slice(0, limit)}\n    ... (truncated, ${text.length} chars total)`,
    truncated: true,
    total: text.length,
  };
}
