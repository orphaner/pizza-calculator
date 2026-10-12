import { test, expect } from '@playwright/test';

// index.html and the web manifest reference icon files that only reach the
// build if angular.json lists them as assets. A missing entry still builds,
// lints and renders fine: it only shows up as a 404 in the network panel.
test('every icon and the manifest referenced by the page are served', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page
    .locator('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  // Guard against a vacuous pass: favicon.ico, the 16 and 32 px PNGs,
  // the Apple touch icon and the manifest.
  expect(hrefs).toHaveLength(5);

  const manifestHref = hrefs.find((href) => href.endsWith('.webmanifest'))!;
  const manifestResponse = await request.get(manifestHref);
  expect(manifestResponse.status(), manifestHref).toBe(200);
  const manifest = await manifestResponse.json();
  const manifestIcons: string[] = manifest.icons.map((icon: { src: string }) => new URL(icon.src, manifestHref).href);
  expect(manifestIcons).toHaveLength(2);

  for (const url of [...hrefs, ...manifestIcons]) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    // A server with a SPA fallback answers a missing file with index.html and a 200.
    expect(response.headers()['content-type'], url).not.toContain('text/html');
  }
});
