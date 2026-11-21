import React, { useEffect, useReducer, useRef, useState } from 'react';
import { startGame, trackKey, transition } from './game.js';

const ignoreRepeat = (event) => {
  if (event.repeat) event.preventDefault();
};

const format = new Intl.NumberFormat('en-US');

function Cover({ track }) {
  const [failed, setFailed] = useState(false);
  if (track.cover && !failed) {
    return (
      <figure className="cover">
        <img src={track.cover} alt="" onError={() => setFailed(true)} />
        {(track.credit || track.creditUrl) && (
          <figcaption>
            {track.creditUrl ? <a href={track.creditUrl}>{track.credit || 'Artwork credit'}</a> : track.credit}
          </figcaption>
        )}
      </figure>
    );
  }

  const hue = Array.from(track.title + track.artist).reduce(
    (value, letter) => (value * 31 + letter.codePointAt(0)) % 360, 0,
  );
  return (
    <div className="cover placeholder" aria-hidden="true" style={{ '--hue': hue }}>
      <div className="record" />
    </div>
  );
}

function Track({ track, label, visible, animate }) {
  return (
    <article className="track" aria-label={label}>
      <p className="label">{label}</p>
      <Cover key={JSON.stringify([trackKey(track), track.cover])} track={track} />
      <h2>{track.title}</h2>
      <p className="artist">{track.artist} · {track.year}</p>
      <p className={animate ? 'count reveal' : 'count'}>
        {visible ? format.format(track.streams) : 'Hidden'}
      </p>
      <p className="label count-label">Dataset streams</p>
    </article>
  );
}

export function Game({ deck, random = Math.random }) {
  const [state, dispatch] = useReducer(
    (current, action) => transition(current, action, deck),
    deck, (tracks) => startGame(tracks, random),
  );
  const firstGuess = useRef(null);
  const continueButton = useRef(null);
  const phase = useRef(state.phase);

  useEffect(() => {
    if (phase.current === state.phase) return;
    phase.current = state.phase;
    (state.phase === 'guess' ? firstGuess : continueButton).current?.focus();
  }, [state.phase]);

  const guessing = state.phase === 'guess';
  const over = state.phase === 'over';
  const guess = (direction) => dispatch({ type: 'guess', direction, round: state.round });

  return (
    <main className="game">
      <header className="top">
        <div>
          <p className="label">2010s music</p>
          <h1>Higher or Lower</h1>
        </div>
        <dl className="stats">
          <div><dt>Score</dt><dd>{state.score}</dd></div>
          <div><dt>Lives</dt><dd>{state.lives}</dd></div>
        </dl>
      </header>
      {state.phase === 'unavailable' ? (
        <section className="unavailable">
          <div className="record" aria-hidden="true" />
          <div>
            <h2>Track deck unavailable</h2>
            <p>This game needs at least two tracks with different counts from a verified dataset.</p>
          </div>
        </section>
      ) : (
        <>
          <p className="question">Does the challenger on the right have more or fewer dataset streams than the known track?</p>
          <div className="match">
            <Track track={state.left} label="Known track" visible />
            <Track track={state.right} label="Challenger" visible={!guessing} animate={!guessing} />
          </div>
          <div className="controls" onKeyDown={ignoreRepeat}>
            <p className="feedback" role="status" aria-atomic="true">
              {state.result && (
                <>
                  {state.result.correct ? 'Correct!' : 'Incorrect.'} The challenger has {state.result.direction === 'higher' ? 'more' : 'fewer'} dataset streams.
                  <span className="sr-only"> Challenger count {format.format(state.right.streams)}.</span>
                  {over && <> Game over. Final score {state.score}.</>}
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
                  ? { type: 'restart', draws: [random(), random()] }
                  : { type: 'next', round: state.round, random: random() })}
              >
                {over ? 'Play again' : 'Next round'}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
