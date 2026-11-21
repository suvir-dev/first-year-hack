import React, { useRef, useState } from 'react';

const STORAGE_KEY = 'art-vs-music.wikipedia-2016-2025.scores';
const MAX_USERNAME = 24;
const TOP_COUNT = 5;
const medals = ['🥇', '🥈', '🥉'];
const samples = [
  { username: 'VinylKid', score: 12, sample: true },
  { username: 'ChartChaser', score: 8, sample: true },
  { username: 'SideB', score: 4, sample: true },
];

function loadScores() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((entry) =>
      typeof entry?.username === 'string' && entry.username.trim() &&
      entry.username.length <= MAX_USERNAME &&
      Number.isSafeInteger(entry.score) && entry.score >= 0) : [];
  } catch {
    return [];
  }
}

export function Leaderboard({ score }) {
  const [scores, setScores] = useState(loadScores);
  const [username, setUsername] = useState('');
  const [savedEntry, setSavedEntry] = useState(null);
  const [persisted, setPersisted] = useState(true);
  const submitted = useRef(false);
  const ranked = [...scores, ...samples].sort((a, b) => b.score - a.score);
  const savedRank = ranked.indexOf(savedEntry) + 1;
  const displayed = ranked.slice(0, TOP_COUNT);
  if (savedRank > TOP_COUNT) displayed.push(savedEntry);

  function saveScore(event) {
    event.preventDefault();
    const name = username.trim();
    if (!name || submitted.current) return;
    submitted.current = true;
    const entry = { username: name, score };
    const updated = [...scores, entry];
    setScores(updated);
    setSavedEntry(entry);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setPersisted(false);
    }
  }

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title">
      <div className="leaderboard-heading">
        <h2 id="leaderboard-title">Leaderboard</h2>
        <p className="label">This browser</p>
      </div>
      <ol className="leaderboard-list" role="list">
        {displayed.map((entry, index) => {
          const current = entry === savedEntry;
          const rank = current ? savedRank : index + 1;
          const medal = medals[rank - 1];
          return (
            <li key={rank} value={rank} className={current ? 'leaderboard-current' : undefined}>
              <span className="leaderboard-rank">
                {medal ? <><span aria-hidden="true">{medal}</span><span className="sr-only">Place {rank}</span></> : rank}
              </span>
              <span className="leaderboard-name">
                {entry.username}
                {entry.sample && <small>Sample</small>}
                {current && <small className="leaderboard-you">You</small>}
              </span>
              <strong>{entry.score}</strong>
            </li>
          );
        })}
      </ol>
      {savedEntry ? (
        <p className="leaderboard-message" role="status">
          {persisted ? 'Score saved.' : 'Score added for this round.'} {savedEntry.username} placed #{savedRank}.
        </p>
      ) : (
        <form className="leaderboard-form" onSubmit={saveScore}>
          <label className="label" htmlFor="leaderboard-username">Username</label>
          <div>
            <input id="leaderboard-username" value={username} onChange={(event) => setUsername(event.target.value)}
              maxLength={MAX_USERNAME} required autoComplete="nickname" />
            <button type="submit" disabled={!username.trim()}>Save score</button>
          </div>
        </form>
      )}
    </section>
  );
}
