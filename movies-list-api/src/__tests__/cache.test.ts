import { InMemoryTtlCache } from '../services/cache';

describe('InMemoryTtlCache', () => {
  let now = 1_000;
  const clock = () => now;

  beforeEach(() => {
    now = 1_000;
  });

  it('returns a stored value before it expires', () => {
    const cache = new InMemoryTtlCache<string>(500, 10, clock);
    cache.set('a', 'one');

    now = 1_400;
    expect(cache.get('a')).toBe('one');
  });

  it('drops a value once the ttl has passed', () => {
    const cache = new InMemoryTtlCache<string>(500, 10, clock);
    cache.set('a', 'one');

    now = 1_600;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently used entry when full', () => {
    const cache = new InMemoryTtlCache<string>(1_000, 2, clock);
    cache.set('a', 'one');
    cache.set('b', 'two');
    cache.get('a');
    cache.set('c', 'three');

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('one');
    expect(cache.get('c')).toBe('three');
  });

  it("invalidates by prefix so one user's write cannot clear another's pages", () => {
    const cache = new InMemoryTtlCache<string>(1_000, 10, clock);
    cache.set('user-1|page-1', 'a');
    cache.set('user-1|page-2', 'b');
    cache.set('user-2|page-1', 'c');

    cache.invalidatePrefix('user-1|');

    expect(cache.get('user-1|page-1')).toBeUndefined();
    expect(cache.get('user-1|page-2')).toBeUndefined();
    expect(cache.get('user-2|page-1')).toBe('c');
  });

  it('is a no-op when caching is disabled with a zero ttl', () => {
    const cache = new InMemoryTtlCache<string>(0, 10, clock);
    cache.set('a', 'one');

    expect(cache.get('a')).toBeUndefined();
  });

  it('clears everything on demand', () => {
    const cache = new InMemoryTtlCache<string>(1_000, 10, clock);
    cache.set('a', 'one');
    cache.clear();

    expect(cache.size).toBe(0);
  });
});
