const PROVIDER = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const inflight = new Map();
const response = body => Response.json(body, { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });

export function forecastTheme(data, latitude, now = Date.now()) {
  const rows = data?.properties?.timeseries;
  if (!Array.isArray(rows)) return 'off';
  const row = rows.reduce((nearest, item) => Number.isFinite(Date.parse(item?.time)) && (!nearest || Math.abs(Date.parse(item.time) - now) < Math.abs(Date.parse(nearest.time) - now)) ? item : nearest, null);
  if (!row || Math.abs(Date.parse(row.time) - now) > 7200000) return 'off';
  const symbol = row.data?.next_1_hours?.summary?.symbol_code ?? row.data?.next_6_hours?.summary?.symbol_code;
  if (typeof symbol !== 'string') return 'off';
  if (/snow|sleet/.test(symbol)) return 'snow';
  if (/rain/.test(symbol)) return 'rain';
  // Leaves are seasonal decoration; precipitation always takes precedence.
  const month = new Date(now).getUTCMonth();
  if ((latitude >= 23 && month >= 8 && month <= 10) || (latitude <= -23 && month >= 2 && month <= 4)) return 'autumn';
  if (/_night|_polartwilight/.test(symbol)) return 'off';
  return /^(clearsky|fair|partlycloudy)_day$/.test(symbol) ? 'sun' : 'off';
}

export async function handleWeather(request, transport = fetch, cache = globalThis.caches?.default, now = Date.now()) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
  const rawLat = request.cf?.latitude, rawLon = request.cf?.longitude;
  const lat = Number(rawLat), lon = Number(rawLon);
  if (rawLat == null || rawLat === '' || rawLon == null || rawLon === '' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return response({ theme: 'off', expiresAt: now + 1800000 });
  // Share forecasts for a coarse area; never forward the visitor IP or exact coordinates.
  const latitude = Math.round(lat * 4) / 4, longitude = Math.round(lon * 4) / 4;
  const key = new Request(new URL(`/__weather-cache/${latitude}/${longitude}`, request.url));
  let cached;
  try { cached = await (await cache?.match(key))?.json(); } catch {}
  const present = record => response({ theme: forecastTheme(record?.data, latitude, now), expiresAt: record?.expiresAt ?? now + 300000 });
  if (cached?.expiresAt > now) return present(cached);
  const area = `${latitude},${longitude}`;
  if (!inflight.has(area)) inflight.set(area, (async () => {
    let record = cached;
    try {
      const headers = { 'User-Agent': 'LocalCloud/1.0 (https://local.cloud/contact/)', Accept: 'application/json' };
      if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;
      const upstream = await transport(`${PROVIDER}?lat=${latitude}&lon=${longitude}`, { headers, signal: AbortSignal.timeout(4000) });
      if (!upstream.ok && upstream.status !== 304) throw Error('Weather unavailable');
      if (upstream.status === 304 && !cached?.data) throw Error('No cached forecast');
      if (upstream.status === 203) console.warn('Weather provider endpoint is deprecated');
      record = {
        data: upstream.status === 304 ? cached.data : await upstream.json(),
        lastModified: upstream.headers.get('Last-Modified') ?? cached?.lastModified,
        expiresAt: Math.max(now + 1800000, Date.parse(upstream.headers.get('Expires')) || 0),
      };
    } catch {
      record = { data: cached?.data ?? null, lastModified: cached?.lastModified, expiresAt: now + 300000 };
    }
    try { await cache?.put(key, Response.json(record, { headers: { 'Cache-Control': 'public, max-age=86400' } })); } catch {}
    return record;
  })().finally(() => inflight.delete(area)));
  return present(await inflight.get(area));
}
