# Art vs Music

A React and Vite Higher or Lower game comparing paintings and sculptures with songs from the supplied Spotify CSV. The score metric is **Wikipedia article views from January 1, 2016 through December 31, 2025**, summed across linked Wikipedia language editions and desktop/mobile access.

## Install and play

Use Node.js 22.12 or newer and npm. The app opens at Vite’s root URL.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The repository includes the generated deck, the source snapshot, and local artwork assets. Players need no credentials or metadata API calls. Browser-local scores are stored under `art-vs-music.wikipedia-2016-2025.scores`, separate from the earlier song-stream game.

Run browser verification with an installed Google Chrome.

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser -- --timeout=60000
```

Alternatively, run `npx playwright install chromium` and then `npm run test:browser -- --timeout=60000`.

## Rules

- Every run opens with art on the left and music on the right. The left count is known and the right count is hidden.
- Guess whether the right item has higher or lower Wikipedia views. Correct guesses earn one point. Mistakes break one of three hearts.
- After each reveal, **Next round** promotes the right item to the left after both correct and incorrect guesses. The new challenger comes from the opposite category, so art and music alternate sides.
- The 🔥 counter tracks consecutive correct answers. Every fourth correct answer repairs one broken heart as ❤️‍🩹, up to three lives. Mistakes reset the streak.
- The final mistake reveals the last count. **Show results** opens the leaderboard and username entry. Sample scores are marked. Saved scores remain in the current browser.
- **Play again** resets score, hearts, difficulty, streak, and history. It avoids repeating the previous opening pair when alternatives exist.
- The rules popup closes with ×, Escape, or a click outside it. The speaker icon toggles the original instrumental loop, which starts on the first click or keypress. Correct guesses play a short original chime.
- Reduced motion shows final counts immediately and disables the slide/reveal animations.

Difficulty uses `abs(log(challenger.views / anchor.views))`. The four ratio bands are at least 1.8, 1.4–under 1.8, 1.15–under 1.4, and greater than 1–under 1.15. Start at the widest band, move one band closer after success, and ease one band after a miss. Exclude same-category and equal-count items, prefer unseen eligible items, and randomly choose in the requested band. If it is empty, use the eligible items nearest its boundaries. Previously seen items cycle back once the unseen pool is exhausted.

## Data and provenance

The bundled snapshot was collected on November 21, 2026. It contains 100 artworks and 100 songs, with 100 local art images and 5,444 linked language-article series across 192 Wikipedia editions. Of those series, 115 had no recorded views for the requested window. Art totals range from 76,569 to 81,509,164, and song totals range from 125,600 to 8,639,524. The generated [audit report](data/wiki/report.json) lists the selection and exclusions.

The music candidate list in `data/wiki/music-candidates.json` comes from the original 120-track deck, with title and artist membership checked against the supplied 599-row CSV. That CSV’s SHA-256 is `982928c9d71a66f5e66ae378132df24cb0107107693f3f131f65c5185d34f131`. The parser handles the BOM, CRLF, quoted commas, blank lines, and duplicate titles/artists. It uses the source’s 2010–2019 year field for membership. Displayed release dates come from reviewed Wikipedia/Wikidata metadata and can differ from that field. [Original CSV](https://raw.githubusercontent.com/Demibolt007/Spotify-Streaming-Insights-2010-2019/main/Spotify%20Dataset.csv)

Songs must resolve to dedicated Wikipedia articles. Ambiguous pages, unrelated recordings, and remixes without separately verified coverage are excluded in the collector or display overrides. Radio-edit rows identify their underlying song article, and the game shows the base song title. Views measure the whole article. The original CSV’s stream, chart, playlist, and popularity columns do not contribute to the new game metric.

Art candidates in `data/wiki/art-candidates.json` cover historic paintings and sculptures, with individual article and image matching. Broader topics, artist pages, series without a single verified work, and uncleared artwork images are excluded. Art dates are labeled **Created**, with **Unveiled** for the documented public unveilings in the reviewed overrides. Approximate dates and ranges retain their uncertainty.

The collector resolves each candidate to a Wikidata ID and retrieves every Wikipedia language sitelink recognized by Wikimedia’s site matrix, including Simple English. It requests each linked article with `all-access`, `user`, and monthly granularity for the full 2016–2025 range. These are page views including repeat visits. The API’s human-classified traffic filter excludes recognized automated traffic. [Wikimedia metric definition](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/concepts/page-views.html)

The snapshot uses the **currently linked language article titles at collection time**. Historical views left under earlier titles after page moves, deleted/unlinked articles, and separate articles for the same work outside those sitelinks are not reconstructed. A language article created after 2016 contributes only its available history. Missing monthly buckets and explicit API no-data responses contribute zero recorded views and are retained in the audit snapshot. HTTP errors and unexpected response schemas stop collection. [Wikimedia API reference](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html)

Each candidate needs at least 10,000 views over the period. For each category, the builder sorts by descending total views and Wikidata ID, then selects 100 evenly spaced positions through that ordering. This includes major headliners and quieter works. It verifies every total against all 120 monthly buckets for every linked language, checks CSV membership and image checksums, and rejects a deck unable to supply a non-tied cross-category matchup.

The authoritative collection dates, row counts, view ranges, exclusions, and selected IDs are generated into `data/wiki/report.json`. The metadata and monthly data are in `metadata.json`, the `views.json` manifest, and its smaller `views-*.json` record files. Only the compact `src/deck.json` enters the JavaScript bundle. Wikimedia statistics are CC0. [Wikimedia access policy](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/documentation/access-policy.html)

## Regenerate or update the snapshot

The source CSV is already in the original project folder. On a fresh checkout, download it first.

```sh
curl -fL 'https://raw.githubusercontent.com/Demibolt007/Spotify-Streaming-Insights-2010-2019/main/Spotify%20Dataset.csv' -o 'Spotify Dataset.csv'
```

From the project root, rebuild the same deck offline from the committed source snapshot.

```sh
npm run data:build -- 'Spotify Dataset.csv'
```

To collect a fresh snapshot, run these stages in order. They require internet access and can take time across thousands of language articles. Successful JSON responses are cached under ignored `.cache/wiki/`; rerunning a failed stage resumes from those cached responses.

```sh
npm run data:collect -- 'Spotify Dataset.csv' metadata
npm run data:collect -- 'Spotify Dataset.csv' images
npm run data:collect -- 'Spotify Dataset.csv' views
npm run data:build -- 'Spotify Dataset.csv'
npm test
npm run build
```

To refresh data that is already cached, move `.cache/wiki/` aside before recollecting. Review the updated metadata, view ranges, and image licenses before committing. Edit candidate article mappings to resolve identity problems. Use `data/wiki/display-overrides.json` for reviewed names, date ranges, or exclusions, with the canonical English article as the key. Its source reference is the corresponding article URL recorded in the deck.

## Artwork

Music cards use original vinyl sleeves with stable per-song colors and patterns. Art cards load local files from `public/art/`, preserving the full painting or sculpture image with `object-fit: contain`.

Commons records in `data/wiki/images.json` preserve the file source URL, creator/photographer attribution, license and license URL when provided, and SHA-256. Expand **Image credit** under an art card for attribution and its Commons source link. Images are unmodified downloaded thumbnails. The snapshot accepts public-domain, CC0, CC BY, and CC BY-SA images. An unavailable image displays a designed fallback with the work’s metadata.

## Review and push

The app lives in the original IntelliJ project folder on `high_low_game`, tracking `origin/high_low_game`. Existing edits to `ideas.txt` or `tasks.txt` can be staged independently. Review the feature files in IntelliJ or scope the Git commands to them.

```sh
git branch --show-current
git status --short
feature_files=(.gitignore README.md index.html package.json package-lock.json playwright.config.js data scripts src test public/art)
git add -A -- "${feature_files[@]}"
git diff --cached --check -- "${feature_files[@]}"
git diff --cached --stat -- "${feature_files[@]}"
git commit --only -m "Build Art vs Music Wikipedia views game" -- "${feature_files[@]}"
git push origin high_low_game
```

Created by Swarit Kapoor.
