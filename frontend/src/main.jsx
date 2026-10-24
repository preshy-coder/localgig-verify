import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
