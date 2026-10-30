import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Note: StrictMode intentionally enabled — all engine/renderer effects implement
// proper cleanup and are double-invoke safe.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
