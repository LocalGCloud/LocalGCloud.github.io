function acceptsGzip(value) {
  const qualities = new Map();
  for (const entry of (value || '').split(',')) {
    const [name, ...parameters] = entry.trim().toLowerCase().split(';');
    const quality = parameters.map((part) => part.trim()).find((part) => part.startsWith('q='));
    const raw = quality?.slice(2) ?? '1';
    const q = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw) ? Number(raw) : 0;
    qualities.set(name, q);
  }
  return (qualities.get('gzip') ?? qualities.get('*') ?? 0) > 0;
}

// Compress before the proxy, keeping no-transform so edge injection cannot alter CSP-protected HTML.
export function compressHtml(request, response) {
  if (!['GET', 'HEAD'].includes(request.method) || ![200, 404].includes(response.status) ||
      !/^text\/html\b/i.test(response.headers.get('Content-Type') || '') ||
      response.headers.has('Content-Encoding') || response.headers.has('Content-Range') ||
      request.headers.has('Range')) return response;

  const headers = new Headers(response.headers);
  if (!(headers.get('Vary') || '').split(',').some((value) => /^(accept-encoding|\*)$/i.test(value.trim()))) {
    headers.append('Vary', 'Accept-Encoding');
  }
  if (!acceptsGzip(request.headers.get('Accept-Encoding'))) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  headers.set('Content-Encoding', 'gzip');
  headers.delete('Content-Length');
  const etag = headers.get('ETag');
  if (etag && !etag.startsWith('W/')) headers.set('ETag', `W/${etag}`);
  const body = response.body ? response.body.pipeThrough(new CompressionStream('gzip')) : null;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
    encodeBody: 'manual', // The stream is already encoded; Workers must not encode it twice.
  });
}
