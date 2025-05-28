import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingTimer } from './FloatingTimer';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FloatingTimer />
  </React.StrictMode>
);