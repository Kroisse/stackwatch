import { use, createContext } from 'react';
import { StackWatchDatabase } from '../db/database';

export interface DatabaseContextValue {
  db: StackWatchDatabase;
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function useDatabase() {
  const context = use(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.db;
}