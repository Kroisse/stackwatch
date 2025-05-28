import React, { createContext, useContext, useMemo } from 'react';
import { StackWatchDatabase } from '../db/database';

interface DatabaseContextValue {
  db: StackWatchDatabase;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const db = useMemo(() => new StackWatchDatabase(), []);

  return (
    <DatabaseContext.Provider value={{ db }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.db;
}