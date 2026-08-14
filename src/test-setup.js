/**
 * Test environment setup.
 *
 * jsdom's localStorage is incomplete here — it exists but has no `clear`, so
 * tests could neither reset between cases nor exercise the persistence paths.
 * A small in-memory Storage keeps behaviour deterministic and, more usefully,
 * lets each test start from a clean slate.
 */

class MemoryStorage {
  #entries = new Map();

  get length() {
    return this.#entries.size;
  }

  key(index) {
    return [...this.#entries.keys()][index] ?? null;
  }

  getItem(key) {
    const k = String(key);
    return this.#entries.has(k) ? this.#entries.get(k) : null;
  }

  setItem(key, value) {
    this.#entries.set(String(key), String(value));
  }

  removeItem(key) {
    this.#entries.delete(String(key));
  }

  clear() {
    this.#entries.clear();
  }
}

function install(target) {
  if (!target) return;
  const existing = target.localStorage;
  if (existing && typeof existing.clear === 'function') return;

  Object.defineProperty(target, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

install(globalThis);
if (typeof window !== 'undefined') install(window);
