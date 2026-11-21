// mount.jsx: puts the Higher or Lower game (a React app) into the page.
// The router calls mountHigherLower() when you open #/higher-lower and
// unmountHigherLower() when you leave, so React only runs while you play.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './Game.jsx';
import deck from './deck.json';
import './higher-lower.css';

let root = null;

export function mountHigherLower(element) {
  if (root) return; // already showing
  root = createRoot(element);
  root.render(<Game deck={deck} />);
}

export function unmountHigherLower() {
  root?.unmount();
  root = null;
}
