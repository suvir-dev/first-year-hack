import React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './Game.jsx';
import deck from './deck.json';
import './style.css';

createRoot(document.getElementById('root')).render(<Game deck={deck} />);
