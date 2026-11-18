/** OpenAPI flattening and request-snippet generation for the API Explorer. Pure; shared. */

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description: string;
  type: string;
}

export interface OpenApiOperation {
  key: string;
  tag: string;
  method: string;
  path: string;
  summary: string;
  operationId: string;
  parameters: OpenApiParameter[];
  hasBody: boolean;
  bodyExample: string;
  destructive: boolean;
}

interface RawParameter {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string };
}

interface RawOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: RawParameter[];
  requestBody?: { content?: Record<string, { example?: unknown; schema?: unknown }> };
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head'];

/** Flatten an OpenAPI 3 document into a sorted operation list, grouped by first tag. */
export function flattenOpenApi(doc: unknown, untaggedLabel = 'Other'): OpenApiOperation[] {
  const paths = (
    doc as { paths?: Record<string, Record<string, RawOperation & { parameters?: RawParameter[] }>> } | null
  )?.paths;
  if (!paths || typeof paths !== 'object') return [];
  const operations: OpenApiOperation[] = [];
  for (const [path, item] of Object.entries(paths)) {
    const shared = Array.isArray(item.parameters) ? item.parameters : [];
    for (const method of METHODS) {
      const op = item[method] as RawOperation | undefined;
      if (!op) continue;
      const params = [...shared, ...(op.parameters ?? [])];
      const names = new Set<string>();
      const parameters: OpenApiParameter[] = [];
      for (const p of params) {
        if (!p?.name || !p.in || names.has(p.in + ':' + p.name)) continue;
        names.add(p.in + ':' + p.name);
        parameters.push({
          name: p.name,
          in: p.in as OpenApiParameter['in'],
          required: !!p.required || p.in === 'path',
          description: p.description ?? '',
          type: p.schema?.type ?? 'string',
        });
      }
      for (const match of path.matchAll(/\{([^}]+)\}/g)) {
        if (!names.has('path:' + match[1])) {
          parameters.push({ name: match[1], in: 'path', required: true, description: '', type: 'string' });
          names.add('path:' + match[1]);
        }
      }
      const content = op.requestBody?.content ?? {};
      const json = content['application/json'];
      const upper = method.toUpperCase();
      operations.push({
        key: upper + ' ' + path,
        tag: op.tags?.[0] ?? untaggedLabel,
        method: upper,
        path,
        summary: op.summary ?? op.description ?? '',
        operationId: op.operationId ?? '',
        parameters,
        hasBody: !!op.requestBody || ['POST', 'PUT', 'PATCH'].includes(upper),
        bodyExample: json?.example !== undefined ? JSON.stringify(json.example, null, 2) : '',
        destructive: upper === 'DELETE' || /\/(bulk|reset|restore|revoke)(\/|$)/i.test(path),
      });
    }
  }
  return operations.sort(
    (a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
}

/** Substitute path parameters and append query parameters. Missing required path values stay as {name}. */
export function resolvePath(operation: OpenApiOperation, values: Record<string, string>): string {
  let path = operation.path.replace(/\{([^}]+)\}/g, (whole, name: string) => {
    const value = values['path:' + name];
    return value ? encodeURIComponent(value) : whole;
  });
  const query = operation.parameters
    .filter((p) => p.in === 'query' && values['query:' + p.name])
    .map((p) => encodeURIComponent(p.name) + '=' + encodeURIComponent(values['query:' + p.name]));
  if (query.length) path += '?' + query.join('&');
  return path;
}

/** Filter operations by a free-text search over method, path, summary, operation ID, and tag. */
export function searchOperations(operations: OpenApiOperation[], term: string): OpenApiOperation[] {
  const t = term.trim().toLowerCase();
  if (!t) return operations;
  return operations.filter((o) =>
    (o.method + ' ' + o.path + ' ' + o.summary + ' ' + o.operationId + ' ' + o.tag).toLowerCase().includes(t),
  );
}

export interface SnippetInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

export function curlSnippet(input: SnippetInput): string {
  const lines = ['curl -X ' + input.method + ' ' + shellQuote(input.url)];
  for (const [k, v] of Object.entries(input.headers)) lines.push('  -H ' + shellQuote(k + ': ' + v));
  if (input.body) lines.push('  --data ' + shellQuote(input.body));
  return lines.join(' \\\n');
}

export function fetchSnippet(input: SnippetInput): string {
  const init: Record<string, unknown> = { method: input.method, headers: input.headers };
  if (input.body) init.body = '__BODY__';
  let text = JSON.stringify(init, null, 2);
  if (input.body) text = text.replace('"__BODY__"', 'JSON.stringify(' + input.body.trim() + ')');
  return (
    'const response = await fetch(' +
    JSON.stringify(input.url) +
    ', ' +
    text +
    ');\nconsole.log(response.status, await response.text());'
  );
}

export function csharpSnippet(input: SnippetInput): string {
  const lines = [
    'using HttpClient client = new HttpClient();',
    'using HttpRequestMessage request = new HttpRequestMessage(new HttpMethod(' +
      JSON.stringify(input.method) +
      '), ' +
      JSON.stringify(input.url) +
      ');',
  ];
  for (const [k, v] of Object.entries(input.headers)) {
    if (k.toLowerCase() === 'content-type') continue;
    lines.push('request.Headers.TryAddWithoutValidation(' + JSON.stringify(k) + ', ' + JSON.stringify(v) + ');');
  }
  if (input.body)
    lines.push(
      'request.Content = new StringContent(' +
        JSON.stringify(input.body) +
        ', System.Text.Encoding.UTF8, "application/json");',
    );
  lines.push('using HttpResponseMessage response = await client.SendAsync(request);');
  lines.push('Console.WriteLine((int)response.StatusCode + " " + await response.Content.ReadAsStringAsync());');
  return lines.join('\n');
}
