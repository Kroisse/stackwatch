import React, { createContext, use, useRef, useEffect } from 'react';
import { StackWatchDatabase } from '../db/database';

interface DatabaseContextValue {
  db: StackWatchDatabase;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const dbRef = useRef<StackWatchDatabase | null>(null);
  
  if (!dbRef.current) {
    dbRef.current = new StackWatchDatabase();
  }

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      dbRef.current?.close();
    };
  }, []);

  return (
    <DatabaseContext value={{ db: dbRef.current }}>
      {children}
    </DatabaseContext>
  );
}

export function useDatabase() {
  const context = use(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.db;
}
