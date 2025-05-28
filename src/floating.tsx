import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingTimer } from './FloatingTimer';
import { DatabaseProvider } from './contexts/DatabaseContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DatabaseProvider>
      <FloatingTimer />
    </DatabaseProvider>
  </React.StrictMode>
);