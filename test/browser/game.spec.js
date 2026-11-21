import { expect, test } from '@playwright/test';

const fixture = [
  { title: 'Test Signal', artist: 'Synthetic Artist', year: 2011, streams: 1000000, cover: '/missing-test-cover.png' },
  { title: 'Test Frequency', artist: 'Synthetic Artist', year: 2012, streams: 2500000 },
  { title: 'Test Echo', artist: 'Synthetic Artist', year: 2013, streams: 1800000 },
  { title: 'Test Pause', artist: 'Synthetic Artist', year: 2014, streams: 1200000 },
  { title: 'Test Replay', artist: 'Synthetic Artist', year: 2015, streams: 1100000 },
];

test('real entry point opens a playable round with the supplied deck', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'Known track' }).locator('.count')).toHaveText(/^[\d,]+$/u);
  await expect(page.getByRole('article', { name: 'Challenger' }).locator('.count')).toHaveText('Hidden');
  await expect(page.getByRole('button', { name: 'Higher' })).toBeEnabled();
});

test('real entry point plays a test run with a fixture deck', async ({ page }, info) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.route(/\/src\/deck\.json(?:\?.*)?$/u, (route) => route.fulfill({
    contentType: 'text/javascript',
    body: `export default ${JSON.stringify(fixture)};`,
  }));
  await page.route('**/missing-test-cover.png', (route) => route.abort());
  await page.goto('/');
  const left = page.getByRole('article', { name: 'Known track' });
  const right = page.getByRole('article', { name: 'Challenger' });
  const stats = page.locator('.stats dd');
  const status = page.getByRole('status');
  const next = page.getByRole('button', { name: 'Next round' });
  const name = (card) => card.getByRole('heading').textContent();
  const score = () => stats.nth(0);
  const lives = () => stats.nth(1);

  await expect(left.locator('.placeholder')).toBeVisible();
  await expect(left.locator('img')).toHaveCount(0);
  await expect(left.locator('.count')).toHaveText('1,000,000');
  await expect(right.locator('.count')).toHaveText('Hidden');
  const opening = [await name(left), await name(right)].sort();

  await page.getByRole('button', { name: 'Higher' }).focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(status).toContainText('Correct!');
  await expect(score()).toHaveText('1');
  await expect(lives()).toHaveText('3');
  await expect(right.locator('.count')).toHaveText('2,500,000');
  await expect(right.locator('.count')).toHaveCSS('animation-name', info.project.name === 'mobile' ? 'none' : 'reveal');

  async function advance() {
    const promotedTitle = await name(right);
    const promotedCount = await right.locator('.count').textContent();
    await next.click();
    await expect(left.getByRole('heading')).toHaveText(promotedTitle);
    await expect(left.locator('.count')).toHaveText(promotedCount);
    await expect(right.locator('.count')).toHaveText('Hidden');
    await expect(page.getByRole('button', { name: 'Higher' })).toBeFocused();
  }

  await advance();
  for (const remaining of [2, 1, 0]) {
    const leftTitle = await name(left);
    const rightTitle = await name(right);
    const leftCount = fixture.find(({ title }) => title === leftTitle).streams;
    const rightCount = fixture.find(({ title }) => title === rightTitle).streams;
    await page.getByRole('button', { name: leftCount < rightCount ? 'Lower' : 'Higher' }).click();
    await expect(status).toContainText('Incorrect.');
    await expect(score()).toHaveText('1');
    await expect(lives()).toHaveText(String(remaining));
    await expect(right.locator('.count')).toHaveText(rightCount.toLocaleString('en-US'));
    if (remaining) await advance();
  }
  await expect(status).toContainText('Game over. Final score 1.');
  await expect(next).toHaveCount(0);
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(score()).toHaveText('0');
  await expect(lives()).toHaveText('3');
  await expect(status).toBeEmpty();
  await expect(right.locator('.count')).toHaveText('Hidden');
  expect([await name(left), await name(right)].sort()).not.toEqual(opening);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
});
