import assert from 'node:assert/strict';
import test from 'node:test';
import { displayTrack, sleeveTitle } from '../src/track-display.js';

test('moves artist credits to the byline while preserving title and edition text', () => {
  const cases = [
    ['South of the Border (feat. Camila Cabello & Cardi B)', 'Ed Sheeran', 'South of the Border', 'Ed Sheeran, Camila Cabello & Cardi B'],
    ['Good as Hell (feat. Ariana Grande) - Remix', 'Lizzo', 'Good as Hell - Remix', 'Lizzo, Ariana Grande'],
    ['Finesse - Remix; feat. Cardi B', 'Bruno Mars', 'Finesse - Remix', 'Bruno Mars, Cardi B'],
    ['One Kiss (with Dua Lipa)', 'Calvin Harris', 'One Kiss', 'Calvin Harris, Dua Lipa'],
    ['Perfect Duet (Ed Sheeran & Beyoncé)', 'Ed Sheeran', 'Perfect Duet', 'Ed Sheeran, Beyoncé'],
    ['Stay With Me', 'Sam Smith', 'Stay With Me', 'Sam Smith'],
    ['Shallow - Radio Edit', 'Lady Gaga', 'Shallow - Radio Edit', 'Lady Gaga'],
  ];

  for (const [title, artist, cleanTitle, byline] of cases) {
    assert.deepEqual(displayTrack({ title, artist }), { title: cleanTitle, artist: byline });
  }
});

test('removes movie soundtrack credits while keeping genuine title words and editions', () => {
  const cases = [
    ['Happy - From "Despicable Me 2"', 'Happy'],
    ['Love Me Like You Do - From "Fifty Shades Of Grey"', 'Love Me Like You Do'],
    ['Earned It (Fifty Shades Of Grey) - From The "Fifty Shades Of Grey" Soundtrack', 'Earned It'],
    [`CAN'T STOP THE FEELING! (Original Song from DreamWorks Animation's "TROLLS")`, "CAN'T STOP THE FEELING!"],
    ['Happy (Radio Edit) - From "Despicable Me 2"', 'Happy (Radio Edit)'],
    ['Work from Home (feat. Ty Dolla $ign)', 'Work from Home'],
    ["I Don't Wanna Live Forever (Fifty Shades Darker)", "I Don't Wanna Live Forever"],
  ];
  for (const [title, expected] of cases) {
    assert.equal(displayTrack({ title, artist: 'Artist' }).title, expected);
  }
});

test('omits radio edits and named remixes only from the sleeve title', () => {
  const cases = [
    ["Don't You Worry Child - Radio Edit", "Don't You Worry Child"],
    ['I Took A Pill In Ibiza - Seeb Remix', 'I Took A Pill In Ibiza'],
    ['Good as Hell (feat. Ariana Grande) - Remix', 'Good as Hell'],
    ['Song (Radio Edit)', 'Song'],
    ['Remix to Ignition', 'Remix to Ignition'],
  ];
  for (const [title, expected] of cases) {
    const card = displayTrack({ title, artist: 'Artist' });
    assert.equal(sleeveTitle(card.title), expected);
    assert.equal(card.title, title.replace(' (feat. Ariana Grande)', ''));
  }
});
