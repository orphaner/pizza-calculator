import { test, expect, Page } from '@playwright/test';

const SECTIONS = ['Ingrédients totaux', 'Biga — la veille', 'Pâte finale — jour J'];

function columnFor(page: Page, section: string) {
  return page.locator('.col-12', { has: page.getByRole('heading', { name: section }) });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Guard: several checks below inspect every .ingredient-row, and would pass
  // vacuously if the app failed to render at all.
  await expect(page.locator('.ingredient-row').first()).toBeVisible();
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
