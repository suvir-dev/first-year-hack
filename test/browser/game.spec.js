import { expect, test } from '@playwright/test';

const fixture = [
  { id: 'test-art-a', kind: 'art', title: 'Test Landscape', artist: 'Synthetic Painter', year: '1889', views: 1000000, image: '/missing-test-art.jpg', articleUrl: 'https://example.com/art', credit: 'Test image', creditUrl: 'https://example.com/credit' },
  { id: 'test-music-a', kind: 'music', title: 'Test Frequency', artist: 'Synthetic Musician', year: '2012', views: 2500000, articleUrl: 'https://example.com/music' },
  { id: 'test-art-b', kind: 'art', title: 'Test Sculpture', artist: 'Synthetic Sculptor', year: '1904', views: 1800000, image: '/missing-test-art.jpg', articleUrl: 'https://example.com/art', credit: 'Test image', creditUrl: 'https://example.com/credit' },
  { id: 'test-music-b', kind: 'music', title: "CAN'T STOP THE FEELING!", artist: 'Synthetic Musician', year: '2016', views: 1200000, articleUrl: 'https://example.com/music' },
  { id: 'test-art-c', kind: 'art', title: 'Test Portrait', artist: 'Synthetic Painter', year: '1665', views: 1100000, image: '/missing-test-art.jpg', articleUrl: 'https://example.com/art', credit: 'Test image', creditUrl: 'https://example.com/credit' },
];

async function dismissRules(page) {
  const dialog = page.getByRole('dialog', { name: 'Art meets music' });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Close rules' }).click();
}

test('production entry point opens with art against music and local artwork', async ({ page }) => {
  await page.route('https://**', (route) => route.abort());
  await page.goto('/');
  await dismissRules(page);
  const left = page.getByRole('article', { name: 'Known work' });
  const right = page.getByRole('article', { name: 'Challenger' });
  await expect(left.locator('.count')).toHaveText(/^[\d,]+$/u);
  await expect(left.locator('.artwork')).toBeVisible();
  await expect(right.locator('.sleeve')).toBeVisible();
  await expect(right.locator('.count')).toHaveText('Hidden');
  await expect(left.locator('img')).toBeVisible();
  await expect.poll(() => left.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole('button', { name: 'Higher' })).toBeEnabled();
  const footer = await page.locator('.footer').boundingBox();
  expect(footer.y + footer.height).toBeGreaterThanOrEqual(page.viewportSize().height - 18);
  expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize().height);
});

test('alternates categories after both guesses, reveals totals, saves results and restarts', async ({ page }, info) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
    window.gameAudioEvents = { chimeNotes: 0, musicStarts: 0, musicStops: 0 };
    for (const [prototype, method, event] of [
      [OscillatorNode.prototype, 'start', 'chimeNotes'],
      [AudioBufferSourceNode.prototype, 'start', 'musicStarts'],
      [AudioBufferSourceNode.prototype, 'stop', 'musicStops'],
    ]) {
      const original = prototype[method];
      prototype[method] = function (...args) {
        window.gameAudioEvents[event]++;
        return original.apply(this, args);
      };
    }
  });
  await page.route(/\/src\/deck\.json(?:\?.*)?$/u, (route) => route.fulfill({
    contentType: 'text/javascript', body: `export default ${JSON.stringify(fixture)};`,
  }));
  await page.route('**/missing-test-art.jpg', (route) => route.abort());
  await page.goto('/');
  await dismissRules(page);

  const left = page.getByRole('article', { name: 'Known work' });
  const right = page.getByRole('article', { name: 'Challenger' });
  const score = page.locator('.stats dd').nth(0);
  const hearts = page.locator('.hearts > [aria-hidden]');
  const streak = page.locator('.streak');
  const feedback = page.locator('.feedback');
  const next = page.getByRole('button', { name: 'Next round' });
  const title = (card) => card.getByRole('heading').textContent();
  const audioEvents = () => page.evaluate(() => window.gameAudioEvents);
  const opening = [await title(left), await title(right)];
  await expect(left.getByText('Image unavailable')).toBeVisible();
  await expect(hearts).toHaveText(['❤️', '❤️', '❤️']);
  await expect(streak).toContainText('0');

  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  await page.mouse.click(5, 5);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await audioEvents()).toEqual({ chimeNotes: 0, musicStarts: 1, musicStops: 0 });

  for (const label of ['Higher', 'Lower']) {
    const buttonBox = await page.getByRole('button', { name: label }).boundingBox();
    const rightBox = await right.boundingBox();
    expect(buttonBox.x).toBeGreaterThanOrEqual(rightBox.x - 1);
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(rightBox.x + rightBox.width + 1);
  }

  await page.getByRole('button', { name: 'Higher' }).focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(feedback).toContainText('Correct!');
  await expect(score).toHaveText('1');
  await expect(streak).toContainText('1');
  await expect(right.locator('.count')).toHaveText('2,500,000');
  await expect(right.locator('.count')).toHaveCSS('animation-name', info.project.name === 'mobile' ? 'none' : 'reveal');

  async function advance() {
    const promotedTitle = await title(right);
    const promotedViews = await right.locator('.count').textContent();
    const wasMusic = await right.locator('.sleeve').count();
    await next.click();
    await expect(left.getByRole('heading')).toHaveText(promotedTitle);
    await expect(left.locator('.count')).toHaveText(promotedViews);
    await expect(right.locator('.count')).toHaveText('Hidden');
    await expect(left.locator(wasMusic ? '.sleeve' : '.artwork')).toBeVisible();
    await expect(right.locator(wasMusic ? '.artwork' : '.sleeve')).toBeVisible();
    await expect(left).toHaveCSS('animation-name', info.project.name === 'mobile' ? 'none' : 'promote');
    await expect(page.getByRole('button', { name: 'Higher' })).toBeFocused();
    const leftCount = await left.locator('.count').boundingBox();
    const rightCount = await right.locator('.count').boundingBox();
    expect(Math.abs(leftCount.y - rightCount.y)).toBeLessThan(1);
  }

  await advance();
  for (const remaining of [2, 1, 0]) {
    const leftTitle = await title(left);
    const rightTitle = await title(right);
    const leftViews = fixture.find(({ title }) => title === leftTitle).views;
    const rightViews = fixture.find(({ title }) => title === rightTitle).views;
    await page.getByRole('button', { name: leftViews < rightViews ? 'Lower' : 'Higher' }).click();
    await expect(feedback).toContainText('Incorrect.');
    await expect(score).toHaveText('1');
    await expect(streak).toContainText('0');
    await expect(hearts.nth(remaining)).toHaveText('💔');
    await expect(right.locator('.count')).toHaveText(rightViews.toLocaleString('en-US'));
    if (remaining) await advance();
  }

  const board = page.getByRole('region', { name: 'Leaderboard' });
  await expect(board).toHaveCount(0);
  await expect(right.locator('.count')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Higher' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show results' }).click();
  await expect(page.getByRole('heading', { name: 'Game over' })).toBeFocused();
  await expect(left).toHaveCount(0);
  await expect(right).toHaveCount(0);
  for (const medal of ['🥇', '🥈', '🥉']) await expect(board.getByText(medal)).toBeVisible();
  expect(await audioEvents()).toEqual({ chimeNotes: 3, musicStarts: 1, musicStops: 0 });
  await page.getByRole('button', { name: 'Mute music', exact: true }).click();
  await expect(page.locator('.speaker-slash')).toBeVisible();
  await board.getByLabel('Username').fill('RoundTester');
  await board.getByRole('button', { name: 'Save score' }).click();
  await expect(board.locator('.leaderboard-current')).toContainText('RoundTester');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('art-vs-music.wikipedia-2016-2025.scores'))))
    .toEqual([{ username: 'RoundTester', score: 1 }]);
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(score).toHaveText('0');
  await expect(hearts).toHaveText(['❤️', '❤️', '❤️']);
  await expect(streak).toContainText('0');
  await expect(left.locator('.artwork')).toBeVisible();
  await expect(right.locator('.sleeve')).toBeVisible();
  expect([await title(left), await title(right)]).not.toEqual(opening);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
});
