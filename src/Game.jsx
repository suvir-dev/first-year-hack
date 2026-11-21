import React, { useEffect, useReducer, useRef, useState } from 'react';
import { STARTING_LIVES, STREAK_FOR_LIFE, startGame, trackKey, transition } from './game.js';
import { displayTrack, sleeveTitle } from './track-display.js';
import { createGameAudio } from './audio.js';
import { Leaderboard } from './Leaderboard.jsx';

const ignoreRepeat = (event) => {
  if (event.repeat) event.preventDefault();
};

const format = new Intl.NumberFormat('en-US');

const REVEAL_DURATION = 700;

function CountUp({ target }) {
  const [count, setCount] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? target : 0,
  );

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let start;
    let complete = false;

    const update = (now) => {
      start ??= now;
      const progress = Math.min((now - start) / REVEAL_DURATION, 1);
      complete = progress === 1;
      setCount(complete ? target : Math.floor(target * (1 - (1 - progress) ** 3)));
      if (!complete) frame = requestAnimationFrame(update);
    };

    const applyPreference = () => {
      cancelAnimationFrame(frame);
      if (motion.matches) {
        complete = true;
        setCount(target);
      } else if (!complete) {
        frame = requestAnimationFrame(update);
      }
    };

    applyPreference();
    motion.addEventListener('change', applyPreference);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', applyPreference);
    };
  }, [target]);

  return <span aria-hidden="true">{format.format(count)}</span>;
}

function Sleeve({ track, title, artist }) {
  const shortTitle = sleeveTitle(title);
  const titleSize = Math.min(7.4, 115 / Array.from(shortTitle).length);
  const design = Array.from(trackKey(track)).reduce(
    (value, letter) => (value * 31 + letter.codePointAt(0)) >>> 0, 0,
  );
  return (
    <div
      className="cover sleeve"
      aria-hidden="true"
      data-pattern={Math.floor(design / 360) % 3}
      style={{ '--hue': design % 360 }}
    >
      <div className="sleeve-art"><div className="record" /></div>
      <div className="sleeve-type">
        <span className="sleeve-title" style={{ '--title-size': `${titleSize}cqi` }}>{shortTitle}</span>
        <span className="sleeve-artist">{artist}</span>
        <span className="sleeve-date">Released {track.year}</span>
      </div>
    </div>
  );
}

function Artwork({ track }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="cover artwork">
      <div className="artwork-image">
        {failed
          ? <span className="label">Image unavailable</span>
          : <img src={track.image} alt={track.title} onError={() => setFailed(true)} />}
      </div>
      <figcaption className="artwork-caption">
        <strong title={track.title}>{track.title}</strong>
        <span title={track.artist}>{track.artist}</span>
        <span>{track.dateLabel ?? 'Created'} {track.year}</span>
      </figcaption>
    </figure>
  );
}

function Track({ track, label, visible, animate, entrance }) {
  const { title, artist } = track.kind === 'music' ? displayTrack(track) : track;
  return (
    <article className={entrance ? `track ${entrance}` : 'track'} aria-label={label}>
      <p className="label">{label} · {track.kind === 'art' ? 'Art' : 'Music'}</p>
      {track.kind === 'art'
        ? <Artwork track={track} />
        : <Sleeve track={track} title={title} artist={artist} />}
      <h2 className="sr-only">{title}</h2>
      <p className="sr-only">{artist} · {track.year}</p>
      <p className={animate ? 'count reveal' : 'count'}>
        {animate ? <CountUp target={track.views} /> : visible ? format.format(track.views) : 'Hidden'}
      </p>
      <p className="label count-label" title={`${track.languages} linked language articles`}>Wikipedia views</p>
      <div className="item-sources">
        <a href={track.articleUrl} target="_blank" rel="noreferrer">Wikipedia</a>
        {track.kind === 'art' && (
          <details className="artwork-credit">
            <summary>Image credit</summary>
            <p>
              {track.credit}{' '}
              <a href={track.creditUrl} target="_blank" rel="noreferrer">Commons source</a>
              {track.licenseUrl && <> · <a href={track.licenseUrl} target="_blank" rel="noreferrer">License</a></>}
            </p>
          </details>
        )}
      </div>
    </article>
  );
}

function Hearts({ lives, mendedHearts, streak }) {
  return (
    <dd className="hearts">
      <span className="sr-only">{lives} of {STARTING_LIVES} lives remaining</span>
      {Array.from({ length: STARTING_LIVES }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index >= lives ? '💔' : index >= lives - mendedHearts ? '❤️‍🩹' : '❤️'}
        </span>
      ))}
      <span className="streak">
        <span aria-hidden="true">🔥 </span>
        <span className="sr-only">Correct answer streak </span>
        {streak}
      </span>
    </dd>
  );
}

export function Game({ deck, random = Math.random }) {
  const [state, dispatch] = useReducer(
    (current, action) => transition(current, action, deck),
    deck, (tracks) => startGame(tracks, random),
  );
  const audio = useRef(null);
  const [musicOn, setMusicOn] = useState(true);
  const rules = useRef(null);
  const firstGuess = useRef(null);
  const continueButton = useRef(null);
  const resultsHeading = useRef(null);
  const phase = useRef(state.phase);

  useEffect(() => {
    if (phase.current === state.phase) return;
    phase.current = state.phase;
    if (state.phase === 'results') {
      resultsHeading.current?.focus();
    } else {
      (state.phase === 'guess' ? firstGuess : continueButton).current?.focus();
    }
  }, [state.phase]);

  useEffect(() => {
    rules.current?.showModal();
  }, []);

  useEffect(() => {
    if (!musicOn) return;
    const startMusic = () => {
      audio.current ??= createGameAudio();
      audio.current?.unlock();
      audio.current?.setMusic(true);
    };
    document.addEventListener('pointerdown', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });
    return () => {
      document.removeEventListener('pointerdown', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
  }, [musicOn]);

  useEffect(() => () => {
    audio.current?.close();
    audio.current = null;
  }, []);

  useEffect(() => {
    if (state.result?.correct) audio.current?.chime();
  }, [state.result]);

  function unlockAudio() {
    audio.current ??= createGameAudio();
    audio.current?.unlock();
    return audio.current;
  }

  function toggleMusic() {
    const player = unlockAudio();
    if (!player) return;
    player.setMusic(!musicOn);
    setMusicOn(!musicOn);
  }

  const guessing = state.phase === 'guess';
  const over = state.phase === 'over';
  function guess(direction) {
    unlockAudio();
    dispatch({ type: 'guess', direction, round: state.round });
  }

  return (
    <main className="game">
      <dialog
        className="rules-dialog"
        ref={rules}
        aria-labelledby="rules-title"
        onClose={() => firstGuess.current?.focus()}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) {
            event.currentTarget.close();
          }
        }}
      >
        <button className="rules-close secondary" aria-label="Close rules" onClick={() => rules.current.close()}>×</button>
        <h2 id="rules-title">Art meets music</h2>
        <ul>
          <li>Guess whether the work on the right has higher or lower Wikipedia article views than the one on the left.</li>
          <li>Views include all available language articles linked to each work, from January 1, 2016 to December 31, 2025.</li>
          <li>Each correct answer earns one point. Each mistake breaks a heart.</li>
          <li>Every four correct answers in a row restores one broken heart as ❤️‍🩹. You can have up to three lives.</li>
          <li>The 🔥 counter shows your current streak. A mistake resets it.</li>
          <li>After the reveal, choose Next round. The right work moves to the left. Art and music alternate after every round.</li>
          <li>When all three hearts break, choose Show results to save your score to this browser’s leaderboard.</li>
        </ul>
      </dialog>
      <header className="top">
        <div>
          <p className="label">Higher or Lower</p>
          <h1>Art vs Music</h1>
        </div>
        <dl className="stats">
          <div><dt>Score</dt><dd>{state.score}</dd></div>
          <div><dt>Lives</dt><Hearts lives={state.lives} mendedHearts={state.mendedHearts} streak={state.streak} /></div>
        </dl>
      </header>
      <p className="period">Wikipedia article views · All linked languages · 2016–2025</p>
      <div className="game-content">
        {state.phase === 'unavailable' ? (
          <section className="unavailable">
            <div className="record" aria-hidden="true" />
            <div>
              <h2>Deck unavailable</h2>
              <p>This game needs an artwork and a song with different Wikipedia view counts.</p>
            </div>
          </section>
        ) : state.phase === 'results' ? (
          <section className="results-screen" aria-labelledby="results-title">
            <div className="results-summary">
              <h2 id="results-title" ref={resultsHeading} tabIndex={-1}>Game over</h2>
              <p>Final score <strong>{state.score}</strong></p>
            </div>
            <Leaderboard score={state.score} />
            <button
              className="secondary"
              onClick={() => dispatch({ type: 'restart', draws: [random(), random()] })}
            >
              Play again
            </button>
          </section>
        ) : (
          <>
            {!over && <p className="question">Does the challenger have more or fewer Wikipedia views?</p>}
            <div className="match">
              <Track
                key={`known-${state.round}`}
                track={state.left}
                label="Known work"
                visible
                entrance={state.round > 1 ? 'track-promoted' : undefined}
              />
              <Track
                key={`challenger-${state.round}`}
                track={state.right}
                label="Challenger"
                visible={!guessing}
                animate={!guessing}
                entrance={state.round > 1 ? 'track-entering' : undefined}
              />
            </div>
            <div className="controls" onKeyDown={ignoreRepeat}>
              <p className="feedback" role="status" aria-atomic="true">
                {state.result && (
                  <>
                    {state.result.correct ? 'Correct!' : 'Incorrect.'}
                    <span className="sr-only"> Challenger count {format.format(state.right.views)}.</span>
                    {state.result.restored && <> {STREAK_FOR_LIFE} correct in a row. Life restored! ❤️‍🩹</>}
                    {over && <> Game over.</>}
                  </>
                )}
              </p>
              {guessing ? (
                <div className="guesses">
                  <button ref={firstGuess} onClick={() => guess('higher')}>Higher</button>
                  <button className="secondary" onClick={() => guess('lower')}>Lower</button>
                </div>
              ) : (
                <button
                  key={state.phase}
                  ref={continueButton}
                  onClick={() => dispatch(over
                    ? { type: 'show-results', round: state.round }
                    : { type: 'next', round: state.round, random: random() })}
                >
                  {over ? 'Show results' : 'Next round'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <footer className="footer">
        <span>© {new Date().getFullYear()} Swarit Kapoor</span>
        <div className="footer-actions">
          <button className="secondary music-toggle" onClick={() => rules.current.showModal()}>Rules</button>
          <button className="secondary music-toggle speaker-toggle" onClick={toggleMusic}
            aria-label={musicOn ? 'Mute music' : 'Unmute music'} aria-pressed={!musicOn}>
            <span aria-hidden="true">🔊</span>
            {!musicOn && <span className="speaker-slash" aria-hidden="true" />}
          </button>
        </div>
      </footer>
    </main>
  );
}
