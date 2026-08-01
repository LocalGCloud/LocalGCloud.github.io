export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolResult<T extends Record<string, unknown> = Record<string, unknown>> {
  [key: string]: unknown;
  content: ToolTextContent[];
  structuredContent: T;
  isError?: boolean;
}

export interface Truncation {
  truncated: boolean;
  originalBytes: number;
  returnedBytes: number;
  limitBytes: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function truncateText(value: string, limitBytes = 16_384): { text: string; truncation: Truncation } {
  const bytes = encoder.encode(value);
  if (bytes.byteLength <= limitBytes) {
    return {
      text: value,
      truncation: {
        truncated: false,
        originalBytes: bytes.byteLength,
        returnedBytes: bytes.byteLength,
        limitBytes,
      },
    };
  }

  const sliced = decoder.decode(bytes.slice(0, limitBytes));
  const marker = '\n… output truncated by localcloud-mcp-server …';
  const text = `${sliced}${marker}`;
  return {
    text,
    truncation: {
      truncated: true,
      originalBytes: bytes.byteLength,
      returnedBytes: encoder.encode(text).byteLength,
      limitBytes,
    },
  };
}

export function jsonResult<T extends Record<string, unknown>>(
  structuredContent: T,
  options: { isError?: boolean; text?: string; limitBytes?: number } = {},
): ToolResult<T & { truncation?: Truncation }> {
  const body = options.text ?? JSON.stringify(structuredContent, null, 2);
  const { text, truncation } = truncateText(body, options.limitBytes ?? 16_384);
  const merged = truncation.truncated
    ? ({ ...structuredContent, truncation } as T & { truncation: Truncation })
    : (structuredContent as T & { truncation?: Truncation });

  return {
    content: [{ type: 'text', text }],
    structuredContent: merged,
    ...(options.isError ? { isError: true } : {}),
  };
}

export function refusal(reason: string, extra: Record<string, unknown> = {}): ToolResult {
  return jsonResult({ ok: false, refused: true, reason, ...extra }, { isError: true });
}
