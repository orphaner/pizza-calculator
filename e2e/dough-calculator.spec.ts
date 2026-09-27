import { test, expect, Page } from '@playwright/test';

/** Reads one ingredient value, e.g. weightIn(page, 'Ingrédients totaux', 'Farine') -> 388 */
async function weightIn(page: Page, section: string, ingredient: string): Promise<number> {
  const column = page.locator('.ingredients .col-12', { has: page.getByRole('heading', { name: section }) });
  const row = column.locator('.ingredient-row', { hasText: ingredient });
  const text = await row.locator('.ingredient-value').innerText();
  return Number(text.replace('g', '').replace(',', '.'));
}

async function setPortion(page: Page, who: 'adultes' | 'enfant', field: 'count' | 'weight', value: string) {
  const label = field === 'count' ? `Nombre de pâtons ${who}` : `Poids d'un pâton ${who}`;
  await page.getByLabel(label).fill(value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('recomputes the ingredients when a portion changes', async ({ page }) => {
  await expect(page.getByText('Poids total de pâte : 640g')).toBeVisible();
  const flourBefore = await weightIn(page, 'Ingrédients totaux', 'Farine');

  await setPortion(page, 'adultes', 'count', '5');

  // 5 x 220 + 2 x 100 = 1300
  await expect(page.getByText('Poids total de pâte : 1300g')).toBeVisible();
  expect(await weightIn(page, 'Ingrédients totaux', 'Farine')).toBeGreaterThan(flourBefore);
});

test('flour and water always add up to the total dough weight', async ({ page }) => {
  await setPortion(page, 'adultes', 'count', '3');
  await setPortion(page, 'enfant', 'count', '1');

  const flour = await weightIn(page, 'Ingrédients totaux', 'Farine');
  const water = await weightIn(page, 'Ingrédients totaux', 'Eau');

  // 3 x 220 + 1 x 100 = 760
  expect(flour + water).toBe(760);
  await expect(page.getByText('Poids total de pâte : 760g')).toBeVisible();
});

test('the biga split adds back up to the complete dough', async ({ page }) => {
  const totalFlour = await weightIn(page, 'Ingrédients totaux', 'Farine');
  const totalWater = await weightIn(page, 'Ingrédients totaux', 'Eau');
  const totalYeast = await weightIn(page, 'Ingrédients totaux', 'Levure');

  const bigaFlour = await weightIn(page, 'Biga', 'Farine');
  const bigaWater = await weightIn(page, 'Biga', 'Eau');
  const bigaYeast = await weightIn(page, 'Biga', 'Levure');

  const finalFlour = await weightIn(page, 'Pâte finale', 'Farine');
  const finalWater = await weightIn(page, 'Pâte finale', 'Eau');
  const finalYeast = await weightIn(page, 'Pâte finale', 'Levure');

  expect(bigaFlour + finalFlour).toBe(totalFlour);
  expect(bigaWater + finalWater).toBe(totalWater);
  expect(bigaYeast + finalYeast).toBeCloseTo(totalYeast, 2);

  // A biga is a stiff pre-ferment: its water is half its own flour weight.
  expect(bigaWater).toBe(Math.round(bigaFlour * 0.5));

  // Salt and oil belong entirely to the final dough, never to the biga.
  await expect(page.locator('.ingredients .col-12', { has: page.getByRole('heading', { name: 'Biga' }) })
    .locator('.ingredient-row', { hasText: 'Sel' })).toHaveCount(0);
});

test('the biga sections appear and disappear with the checkbox', async ({ page }) => {
  const bigaHeading = page.getByRole('heading', { name: 'Biga — la veille' });
  const finalHeading = page.getByRole('heading', { name: 'Pâte finale — jour J' });
  const totalsHeading = page.getByRole('heading', { name: 'Ingrédients totaux' });
  const sameDayHeading = page.getByRole('heading', { name: 'Pâte le jour même' });

  await expect(bigaHeading).toBeVisible();
  // With a biga, the first column is just the totals, not a dough you mix.
  await expect(totalsHeading).toBeVisible();
  await expect(sameDayHeading).toHaveCount(0);

  const checkbox = page.getByLabel('Préparer avec une biga');
  await expect(checkbox).toBeChecked();

  await checkbox.uncheck();
  await expect(bigaHeading).toHaveCount(0);
  await expect(finalHeading).toHaveCount(0);
  // Without a biga, that same column becomes the dough made on the day.
  await expect(sameDayHeading).toBeVisible();
  await expect(totalsHeading).toHaveCount(0);

  await checkbox.check();
  await expect(bigaHeading).toBeVisible();
  await expect(totalsHeading).toBeVisible();
});

test('changing the biga flour share moves flour between the two stages', async ({ page }) => {
  const totalFlour = await weightIn(page, 'Ingrédients totaux', 'Farine');

  await page.getByLabel('Farine en biga').fill('50');

  const bigaFlour = await weightIn(page, 'Biga', 'Farine');
  const finalFlour = await weightIn(page, 'Pâte finale', 'Farine');

  expect(bigaFlour).toBe(Math.round(totalFlour * 0.5));
  expect(bigaFlour + finalFlour).toBe(totalFlour);
});
