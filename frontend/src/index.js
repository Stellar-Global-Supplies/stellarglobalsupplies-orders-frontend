import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from './registerSW';
import { initTracing } from './tracing';

// Initialise OTLP tracing BEFORE React mounts so the document-load span
// captures the full page lifecycle and all fetch spans are instrumented.
initTracing();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerSW();
