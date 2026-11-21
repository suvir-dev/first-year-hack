# Higher or Lower · 2010s

A static React and Vite game about stream counts for songs from the 2010s. The game opens at `/`. The production deck uses the supplied CSV for gameplay at the project owner’s direction. The game labels counts **Dataset streams**. The audit below documents the attribution issue. The deterministic browser playthrough uses test fixtures.

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. For browser tests, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. To use installed Google Chrome, run `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`. The tests start their own Vite server on port 4173 and exercise the real entry point at desktop and mobile widths. Fixture counts are supplied by Playwright request interception.

## Rules

The known track starts on the left and the challenger on the right. Guess whether the challenger has more or fewer **dataset streams**. A correct answer earns one point. A miss costs one of three lives. Each guess reveals the exact count. Select **Next round** to promote the challenger to the known position after either result. The third miss shows the final count and score. **Play again** resets the difficulty, score, lives, and track history and draws a different opening pair when possible.

The selector compares `abs(log(challenger.streams / anchor.streams))`. The four difficulty bands correspond to larger-to-smaller count ratios of at least 1.8, 1.4 to under 1.8, 1.15 to under 1.4, and greater than 1 to under 1.15. Start at the widest band, move one band closer after success, and ease one band after a miss, bounded by the four levels. After excluding the anchor and tied counts, consider unseen tracks first and reuse tracks once no unseen option remains. Draw randomly in the requested band or among the candidates nearest to its boundaries.

## Data audit

The attached file matches the published CSV byte for byte. It has 599 data rows, 25 headers, a UTF-8 BOM, CRLF line endings, and SHA-256 `982928c9d71a66f5e66ae378132df24cb0107107693f3f131f65c5185d34f131`. The publisher credits DataCamp Workspace and describes `Streams` as total streams. The CSV supplies no track IDs or count timestamps. `Popularity` and playlist and chart fields are separate. The decade filter uses the CSV year field, which contains some chart or listing years that differ from original release dates. An approved historical deck should document its count date, method, and coverage before publication. [Published repository](https://github.com/Demibolt007/Spotify-Streaming-Insights-2010-2019) · [Raw CSV](https://raw.githubusercontent.com/Demibolt007/Spotify-Streaming-Insights-2010-2019/main/Spotify%20Dataset.csv)

- A downloaded DataCamp-derived candidate metadata file had 603 rows and no stream-count field. A multiset comparison matched all 599 supplied `Song`, `Artist`, and `Year` triples after trimming, case-folding, and NFC normalization. DataCamp describes year-based top-song coverage. The exact process used to assemble the supplied CSV and append its counts remains unverified. [DataCamp dataset](https://www.datacamp.com/datalab/datasets/dataset-r-spotify-music) · [Candidate metadata CSV](https://raw.githubusercontent.com/sharbelxo/spotify-data-analysis/main/spotify_top_music.csv)
- I downloaded the Kaggle archive and indexed its 953 rows by the exact `streams` string from `spotify-2023.csv` (SHA-256 `26fd1292465877c24a9f5bfc6bf933c0715356a9c7d3197f2c4bc8b1a668a215`). Looking up each supplied `Streams` string produced 593 row hits covering 589 distinct count strings. Only one hit shared the normalized song title, “Someone You Loved.” For example, 1,440,757,818 is assigned to “7 Years” by Lukas Graham in the supplied CSV and “Me Porto Bonito” by Chencho Corleone and Bad Bunny in the comparison file. The latter file assigns 665,765,558 to “jealousy, jealousy” by Olivia Rodrigo, while the supplied CSV assigns it to Beyoncé’s `43776`. This pattern indicates the supplied counts were reassigned across songs. It does not establish who reassigned them or how the comparison file obtained its own counts. [2023 comparison dataset](https://www.kaggle.com/datasets/nelgiriyewithana/top-spotify-songs-2023) · [Archive download](https://www.kaggle.com/api/v1/datasets/download/nelgiriyewithana/top-spotify-songs-2023)
- `43776` is consistent with a spreadsheet date serial for 2019-11-07 in the Excel 1900 date system. Beyoncé has a track titled “7/11” on the 2014 platinum edition, but the row identity and count remain unresolved. Both “All I Ask” rows are quarantined because their years and counts conflict, and the album lists the song in 2015. Britney Spears’ “3” is a legitimate numeric title, with a documented 2009 release, so that specific row is outside the decade despite its supplied 2010 year. Other numeric titles pass the same rules as text titles. [Beyoncé release](https://music.apple.com/us/song/1309038037) · [Adele release](https://music.apple.com/us/song/1544494912) · [Britney Spears release](https://music.apple.com/us/song/337963631)

The production deck contains **120 playable tracks and 0 verified covers**. Treat the counts as values from the supplied file, with the attribution limitations above.

## Regenerate the deck

Run the command with the attached CSV from the project folder. If you need a fresh copy, download the published CSV first.

```sh
curl -fL 'https://raw.githubusercontent.com/Demibolt007/Spotify-Streaming-Insights-2010-2019/main/Spotify%20Dataset.csv' -o 'Spotify Dataset.csv'
npm run data:build -- 'Spotify Dataset.csv'
```

The parser handles UTF-8 BOMs, CRLF, blank lines and CSV quoting. It requires exactly one `Song`, `Artist`, `Year`, and `Streams` header. It trims text, requires song and artist, checks four-digit years, and parses positive safe integers with optional valid thousands grouping. It compares titles and artists with NFC normalization, collapsed whitespace, and lowercasing, preserving the selected row’s display text and any edition or remix wording. Where normalized keys share the same year and count it keeps the first row. Conflicting years or counts quarantine the whole group. It applies the two documented track-specific metadata exclusions and filters years to 2010–2019.

It ranks the remaining tracks by descending stream count, breaking ties by normalized key, and takes at most 120. It checks for at least two distinct totals and compares each candidate count against its original CSV field as a `BigInt`. The CLI reports reasons by logical CSV record number, including the header as record 1 and skipping blank lines.

For the supplied file, 26 rows were quarantined as conflicting duplicates and two for the documented track-specific issues. Of the remaining 571, 451 were below the cutoff and 120 passed structural validation and exact count checks. The supplied checksum is enabled for gameplay in `data/sources.json`, so the CLI writes those 120 candidates to `src/deck.json`. After auditing a replacement with the same required columns, add its exact SHA-256 to `data/sources.json` with `"approved": true` and a reason that cites the supporting evidence, then regenerate and review `src/deck.json`. The raw CSV stays outside the browser build.

### Cover mappings

Use a release image licensed for use in this game and verify the song, artist, and edition against its release listing. For each approved image, save it under `public/covers/` and add an entry to `data/covers.json`. The key is the JSON-encoded normalized title and artist as returned by `trackKey` in `src/game.js`, for example `["example title","example artist"]`. Set `path` to `/covers/example.webp` or a permitted static HTTPS image URL, and add `credit` text when required. Record the release URL, rights basis, and any required link in the entry as `source`, `license`, and `creditUrl`. Regenerate the deck after changing a mapping. Missing or broken images use the record placeholder. The Spotify Developer Policy prohibits games using its platform, so artwork from that platform was excluded. [Spotify Developer Policy](https://developer.spotify.com/policy)

## Review and push

The game is at the root of the original IntelliJ project checkout. Run these commands from that folder on `high_low_game`, which tracks `origin/high_low_game`. The path list scopes staging, review, and the commit to the feature files so any pre-existing staged edits stay separate.

```sh
git branch --show-current
git status --short
feature_paths=(.gitignore README.md index.html package.json package-lock.json playwright.config.js data scripts src test)
git add -- "${feature_paths[@]}"
git diff --cached --check -- "${feature_paths[@]}"
git diff --cached -- "${feature_paths[@]}"
git commit --only -m "Implement 2010s Higher or Lower game" -- "${feature_paths[@]}"
git push origin high_low_game
```

Original repository contributor: Swarit Kapoor.
