import React, { useRef } from 'react';
import { StackWatchDatabase } from '../db/database';
import { DatabaseContext } from '../hooks/useDatabaseContext';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const dbRef = useRef<StackWatchDatabase | null>(null);
  
  dbRef.current ??= new StackWatchDatabase();

  return (
    <DatabaseContext value={{ db: dbRef.current }}>
      {children}
    </DatabaseContext>
  );
}
