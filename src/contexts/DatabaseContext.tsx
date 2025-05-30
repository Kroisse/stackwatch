import React, { useRef, useEffect } from 'react';
import { StackWatchDatabase } from '../db/database';
import { DatabaseContext } from '../hooks/useDatabaseContext';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const dbRef = useRef<StackWatchDatabase | null>(null);
  
  dbRef.current ??= new StackWatchDatabase();

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
