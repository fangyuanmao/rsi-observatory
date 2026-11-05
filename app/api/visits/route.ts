import { env } from 'cloudflare:workers';

const key = 'rsi/metrics/visits.json';
const headers = { 'Cache-Control': 'no-store' };
function count(value: unknown): number {
  const n = (value as { total?: unknown })?.total;
  if (!Number.isSafeInteger(n) || (n as number) < 0) throw Error('Invalid visit counter');
  return n as number;
}
export async function GET() {
  try {
    const object = await env.BUCKET.get(key);
    return Response.json(
  { total: object ? count(await object.json()) : 0 },
  {
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': 'https://ferris-geek.github.io',
    },
  },
);
  } catch {
    return Response.json({ error: 'Visit count is temporarily unavailable.' }, { status: 503, headers });
  }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('x-visit-counter') !== '1') {
    return Response.json({ error: 'Same-origin requests only.' }, { status: 403, headers });
  }
  try {
    // Conditional writes prevent concurrent visitors overwriting each other's counts.
    for (let attempt = 0; attempt < 6; attempt++) {
      const object = await env.BUCKET.get(key);
      const total = (object ? count(await object.json()) : 0) + 1;
      if (!Number.isSafeInteger(total)) throw Error('Counter overflow');
      const written = await env.BUCKET.put(key, JSON.stringify({ total }), {
        onlyIf: object ? { etagMatches: object.etag } : new Headers({ 'If-None-Match': '*' }),
        httpMetadata: { contentType: 'application/json' },
      });
      if (written) return Response.json({ total }, { headers });
    }
    throw Error('Counter is busy');
  } catch {
    return Response.json({ error: 'Visit count is temporarily unavailable.' }, { status: 503, headers });
  }
}
