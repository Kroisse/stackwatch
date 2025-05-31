import Dexie, { Table, TransactionMode } from 'dexie';

interface DexieWithTasks extends Dexie {
  tasks: Table<unknown>;
}

export interface TransactionalOptions {
  signal?: AbortSignal;
}

// Type aliases to reduce duplication
type TransactionalMethod<This, Return> = (
  this: This,
  options?: TransactionalOptions,
) => Promise<Return>;

type TransactionalDecorator<This, Return> = (
  target: TransactionalMethod<This, Return>,
  context: ClassMethodDecoratorContext<This>,
) => TransactionalMethod<This, Return>;

class SignalScope implements AsyncDisposable {
  #signal: AbortSignal;
  #handler: () => void;

  constructor(signal: AbortSignal, handler: () => void) {
    this.#signal = signal;
    this.#handler = handler;
    this.#signal.addEventListener('abort', this.#handler);
  }

  [Symbol.asyncDispose](): Promise<void> {
    this.#signal.removeEventListener('abort', this.#handler);
    return Promise.resolve();
  }
}

/**
 * Decorator to wrap a database method in a transaction with optional AbortSignal support
 * @param mode - Transaction mode ('r' for read-only, 'rw' for read-write)
 */
export function transactional<This extends DexieWithTasks, Return>(
  mode: TransactionMode,
): TransactionalDecorator<This, Return> {
  return (target, _context) => {
    return async function (this, options?) {
      // Extract signal from options
      const signal = options?.signal;

      // Check if already aborted
      signal?.throwIfAborted();

      // If there's already a transaction, just set up abort handling
      const existingTx = Dexie.currentTransaction;
      if (existingTx) {
        if (signal) {
          await using _txScope = new SignalScope(signal, () => {
            existingTx.abort();
            throw new Dexie.AbortError('Operation was aborted');
          });
        }
        return await target.call(this, options);
      }

      // Otherwise, create a new transaction
      // Track if we should abort the transaction
      let shouldAbort = false;
      if (signal) {
        await using _scope = new SignalScope(signal, () => {
          shouldAbort = true;
        });
      }

      return await this.transaction(mode, this.tasks, async (tx) => {
        signal?.throwIfAborted();

        // Check if we should abort
        if (shouldAbort) {
          tx.abort();
        }

        // Re-check abort status
        if (signal?.aborted) {
          throw new Dexie.AbortError('Operation was aborted');
        }

        // Listen for future aborts
        if (signal) {
          await using _txScope = new SignalScope(signal, () => tx.abort());
        }
        return await target.call(this, options);
      });
    };
  };
}
