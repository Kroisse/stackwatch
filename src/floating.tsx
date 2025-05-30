import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingTimer } from './FloatingTimer';
import { DatabaseProvider } from './contexts/DatabaseContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DatabaseProvider>
      <FloatingTimer />
    </DatabaseProvider>
  </React.StrictMode>,
);
