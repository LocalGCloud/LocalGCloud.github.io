import licenseText from '../data/legal/public-preview-license.txt?raw';

// The governing license, byte for byte; scripts/verify-content-facts.mjs checks its digest.
export function GET() {
  return new Response(licenseText, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
