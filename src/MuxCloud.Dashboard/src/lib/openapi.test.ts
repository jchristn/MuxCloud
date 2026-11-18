import { describe, expect, it } from 'vitest';
import { curlSnippet, flattenOpenApi, resolvePath, searchOperations } from './openapi';

const doc = {
  paths: {
    '/v1.0/api/machines/{id}': {
      get: { tags: ['Machines'], summary: 'Get machine' },
      delete: { tags: ['Machines'], summary: 'Delete machine' },
    },
    '/v1.0/api/machines': {
      get: {
        tags: ['Machines'],
        summary: 'List',
        parameters: [{ name: 'online', in: 'query', schema: { type: 'boolean' } }],
      },
    },
    '/v1.0/api/health': { get: { summary: 'Health' } },
  },
};

describe('openapi helpers', () => {
  it('flattens, adds implicit path params, and flags destructive operations', () => {
    const ops = flattenOpenApi(doc);
    expect(ops).toHaveLength(4);
    const del = ops.find((o) => o.method === 'DELETE')!;
    expect(del.destructive).toBe(true);
    expect(del.parameters[0]).toMatchObject({ name: 'id', in: 'path', required: true });
    expect(ops.find((o) => o.path === '/v1.0/api/health')!.tag).toBe('Other');
  });
  it('resolves paths and searches', () => {
    const ops = flattenOpenApi(doc);
    const get = ops.find((o) => o.key === 'GET /v1.0/api/machines')!;
    expect(resolvePath(get, { 'query:online': 'true' })).toBe('/v1.0/api/machines?online=true');
    const one = ops.find((o) => o.key === 'GET /v1.0/api/machines/{id}')!;
    expect(resolvePath(one, { 'path:id': 'mch 1' })).toBe('/v1.0/api/machines/mch%201');
    expect(searchOperations(ops, 'health')).toHaveLength(1);
  });
  it('quotes curl safely', () => {
    expect(curlSnippet({ method: 'POST', url: "http://h/x'y", headers: {}, body: '{"a":1}' })).toContain(
      "'http://h/x'\\''y'",
    );
  });
});
