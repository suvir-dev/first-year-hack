import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

export const USER_AGENT = 'ArtVsMusicGame/1.0 (https://github.com/suvir-dev/first-year-hack)';
const cache = new URL('../.cache/wiki/', import.meta.url);
const hash = (text) => createHash('sha256').update(text).digest('hex');

export async function getJson(url) {
  await mkdir(cache, { recursive: true });
  const path = new URL(hash(url) + '.json', cache);
  try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    let response;
    try {
      response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(45000) });
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(2 ** attempt * 1000);
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      await delay(Math.max(Number(response.headers.get('retry-after')) || 0, 2 ** attempt) * 1000);
      continue;
    }
    const data = await response.json();
    if (response.status === 404 && /pageviews\/per-article/u.test(url) && /no data|not found/i.test(JSON.stringify(data))) {
      const missing = { noData: true, response: data };
      await writeFile(path, JSON.stringify(missing));
      return missing;
    }
    if (!response.ok || data.error) throw new Error(`${url}: ${response.status} ${JSON.stringify(data).slice(0, 300)}`);
    const temp = new URL(hash(url) + '.' + process.pid + '.tmp', cache);
    await writeFile(temp, JSON.stringify(data));
    await rename(temp, path);
    return data;
  }
  throw new Error('Wikimedia rate limit or server failure persisted: ' + url);
}

export const apiUrl = (host, params) =>
  `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`;

export async function mapLimit(items, concurrency, task) {
  let index = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await task(items[current], current);
    }
  }));
  return results;
}

export async function saveJson(path, data) {
  const temp = path + '.tmp';
  await writeFile(temp, JSON.stringify(data) + '\n');
  await rename(temp, path);
}
