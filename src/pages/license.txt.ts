import licenseText from '../data/legal/public-preview-license.txt?raw';
import { licenseWithoutVersion } from '../utils/license-document.mjs';

// Same terms as the source agreement, with internal release metadata omitted.
export function GET() {
  return new Response(licenseWithoutVersion(licenseText), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
