import Dexie, { Table } from 'dexie';

interface DexieWithTasks extends Dexie {
  tasks: Table<unknown>;
}

export interface AbortableOptions {
  signal?: AbortSignal;
}

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
 * Decorator to make a database method cancellable with AbortSignal
 * The method should accept an options object with optional signal
 */
export function abortable<This extends DexieWithTasks, Return>(
  target: (this: This, options?: AbortableOptions) => Promise<Return>,
  _context: ClassMethodDecoratorContext<This>,
): (this: This, options?: AbortableOptions) => Promise<Return> {
  return async function (
    this: This,
    options?: AbortableOptions,
  ): Promise<Return> {
    // Extract signal from options
    const signal = options?.signal;

    // If no signal, just call the original method
    if (!signal) {
      return target.call(this, options);
    }

    // Check if already aborted
    signal.throwIfAborted();

    // Track if we should abort the transaction
    let shouldAbort = false;
    await using _scope = new SignalScope(signal, () => {
      shouldAbort = true;
    });

    return await this.transaction('r', this.tasks, async () => {
      signal.throwIfAborted();

      // Set up abort on current transaction
      const tx = Dexie.currentTransaction;
      if (tx && shouldAbort) {
        tx.abort();
      }

      // Re-check abort status
      if (signal.aborted) {
        throw new Dexie.AbortError('Operation was aborted');
      }

      // Listen for future aborts
      await using _txScope = new SignalScope(signal, () => tx?.abort());
      return await target.call(this, options);
    });
  };
}

/**
 * Decorator for read-write operations
 */
export function abortableRW<This extends Dexie, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Promise<Return>,
  _context: ClassMethodDecoratorContext<This>,
) {
  return async function (this: This, ...args: Args): Promise<Return> {
    // Check if last argument is AbortSignal
    const lastArg = args[args.length - 1];
    const signal = lastArg instanceof AbortSignal ? lastArg : undefined;

    // If no signal, just call the original method
    if (!signal) {
      return target.apply(this, args);
    }

    // For write operations, we don't wrap in transaction
    // as the method itself likely creates its own transaction
    signal.throwIfAborted();

    const checkAbort = () => {
      if (signal.aborted) {
        throw new Dexie.AbortError('Operation was aborted');
      }
    };

    // Periodically check abort status
    const interval = setInterval(checkAbort, 100);

    try {
      return await target.apply(this, args);
    } finally {
      clearInterval(interval);
    }
  };
}
