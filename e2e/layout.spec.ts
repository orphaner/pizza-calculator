import { test, expect, Page } from '@playwright/test';

const SECTIONS = ['Ingrédients totaux', 'Biga — la veille', 'Pâte finale — jour J'];

function columnFor(page: Page, section: string) {
  return page.locator('.col-12', { has: page.getByRole('heading', { name: section }) });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Guard: several checks below inspect every .ingredient-row / .setting-row,
  // and would pass vacuously if the app failed to render at all.
  await expect(page.locator('.ingredient-row').first()).toBeVisible();
  await expect(page.locator('.setting-row').first()).toBeVisible();
});

test('no setting label wraps and no field is clipped', async ({ page }) => {
  // 2 portions + 4 dough parameters + the biga toggle + the biga flour share.
  await expect(page.locator('.setting-row')).toHaveCount(8);

  const problems = await page.evaluate(() =>
    [...document.querySelectorAll('.setting-row')].flatMap((row) => {
      const label = row.querySelector('.setting-label') as HTMLElement;
      const rowBox = row.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
      const issues: string[] = [];
      if (label.getBoundingClientRect().height > lineHeight * 1.5) issues.push('label wraps');
      for (const field of row.querySelectorAll('input, .input-group-text')) {
        const box = field.getBoundingClientRect();
        if (box.right > rowBox.right - 1 || box.left < rowBox.left) issues.push('field clipped');
      }
      return issues.length ? [`${label.textContent?.trim()}: ${issues.join(', ')}`] : [];
    }),
  );
  expect(problems).toEqual([]);
});

test('the two settings panels sit side by side on desktop and stack on mobile', async ({ page }, testInfo) => {
  const portions = page.locator('.col-12', { has: page.getByRole('heading', { name: 'Portions' }) });
  const params = page.locator('.col-12', { has: page.getByRole('heading', { name: 'Paramètres de la pâte' }) });

  const a = (await portions.boundingBox())!;
  const b = (await params.boundingBox())!;

  if (testInfo.project.name === 'mobile') {
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
  } else {
    expect(b.y).toBe(a.y);
    expect(b.x).toBeGreaterThan(a.x);
  }
});

test('the page never scrolls horizontally', async ({ page }) => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('no ingredient label wraps and no value is clipped', async ({ page }) => {
  // 5 complete-dough + 3 biga + 6 final-dough rows.
  await expect(page.locator('.ingredient-row')).toHaveCount(14);

  const problems = await page.evaluate(() =>
    [...document.querySelectorAll('.ingredient-row')].flatMap((row) => {
      const label = row.querySelector('.ingredient-label') as HTMLElement;
      const value = row.querySelector('.ingredient-value') as HTMLElement;
      const rowBox = row.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
      const issues: string[] = [];
      if (label.getBoundingClientRect().height > lineHeight * 1.5) issues.push('label wraps');
      if (value.getBoundingClientRect().right > rowBox.right - 1) issues.push('value clipped');
      return issues.length ? [`${label.textContent?.trim()}: ${issues.join(', ')}`] : [];
    }),
  );
  expect(problems).toEqual([]);
});

test('no control is covered by another element', async ({ page }) => {
  // The "Fork me on GitHub" ribbon is a rotated link inside a large, mostly
  // empty box at z-index 9999; it silently swallowed clicks on whatever sat
  // underneath. A green build, green unit tests and a correct-looking page all
  // missed it, because nothing is visually wrong.
  const inputs = page.locator('input');
  const count = await inputs.count();
  expect(count).toBeGreaterThan(0);

  const blocked: string[] = [];
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    // Playwright's scroll settles before the measurement; scrolling from inside
    // page.evaluate does not, and elementFromPoint then reads a stale position
    // and returns null for anything still off-screen.
    await input.scrollIntoViewIfNeeded();
    const problem = await input.evaluate((el: HTMLElement) => {
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      if (top === el || el.contains(top)) return null;
      const name = el.id || el.getAttribute('aria-label') || 'input';
      const over = top instanceof HTMLElement ? top.id || top.className : 'nothing (point off-screen)';
      return `${name} is covered by ${over}`;
    });
    if (problem) blocked.push(problem);
  }

  expect(blocked).toEqual([]);
});

test('the three sections are all present', async ({ page }) => {
  for (const section of SECTIONS) {
    await expect(columnFor(page, section)).toBeVisible();
  }
});

test('the total dough weight sits below every section', async ({ page }) => {
  const total = page.locator('.dough-total');
  await expect(total).toBeVisible();
  const totalBox = (await total.boundingBox())!;

  for (const section of SECTIONS) {
    const sectionBox = (await columnFor(page, section).boundingBox())!;
    expect(totalBox.y).toBeGreaterThanOrEqual(sectionBox.y + sectionBox.height);
  }
});

test('the sections stack on mobile and sit side by side on desktop', async ({ page }, testInfo) => {
  const boxes = [];
  for (const section of SECTIONS) {
    boxes.push((await columnFor(page, section).boundingBox())!);
  }

  if (testInfo.project.name === 'mobile') {
    // Each section starts below the previous one.
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height);
    }
  } else {
    // All three share the same top edge.
    expect(boxes[1].y).toBe(boxes[0].y);
    expect(boxes[2].y).toBe(boxes[0].y);
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
  }
});
