/** Sparkline-in-square mark for CognitiveLint CI (masthead + favicon). */
export function brandMarkSvg(options?: { gradientId?: string }): string {
  const gid = options?.gradientId ?? 'cl-logo-bg';
  return `<svg class="cl-brand__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${gid}" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2b9af3"/>
      <stop offset="1" stop-color="#0066cc"/>
    </linearGradient>
  </defs>
  <rect width="28" height="28" rx="5" fill="url(#${gid})"/>
  <polyline fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" points="5,19 10,14 15,16 21,9"/>
  <circle cx="15" cy="16" r="2.75" fill="#ffffff" stroke="#151515" stroke-width="1.25"/>
</svg>`;
}

export function faviconSvg(): string {
  return brandMarkSvg({ gradientId: 'cl-favicon-bg' });
}

export function brandLogoHtml(): string {
  return `<span class="cl-brand__mark">${brandMarkSvg()}</span>`;
}
