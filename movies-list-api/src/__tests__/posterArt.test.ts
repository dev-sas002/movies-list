import { renderPoster } from '../db/posterArt';

describe('generated poster art', () => {
  const poster = renderPoster({
    title: 'Blade Runner',
    year: 1982,
    tags: ['sci-fi', 'noir'],
    index: 0,
  });

  it('is a self-contained svg with the movie on it', () => {
    expect(poster.startsWith('<svg')).toBe(true);
    expect(poster).toContain('BLADE');
    expect(poster).toContain('1982');
    expect(poster).toContain('SCI-FI');
  });

  it('escapes titles that would otherwise break the markup', () => {
    const escaped = renderPoster({ title: 'Truffaut & <Co>', year: 1968, tags: [], index: 1 });

    expect(escaped).toContain('&amp;');
    expect(escaped).not.toContain('<Co>');
  });

  it('varies the artwork so a seeded grid does not look cloned', () => {
    const a = renderPoster({ title: 'A', year: 2000, tags: [], index: 0 });
    const b = renderPoster({ title: 'A', year: 2000, tags: [], index: 1 });

    expect(a).not.toBe(b);
  });

  it('shrinks the title so a long one stays inside the artwork', () => {
    const long = renderPoster({
      title: 'Mad Max: Fury Road',
      year: 2015,
      tags: ['action'],
      index: 2,
    });

    const sizes = [...long.matchAll(/font-size="(\d+)" font-weight="700"/g)].map((m) =>
      Number(m[1])
    );

    expect(sizes.length).toBeGreaterThan(0);

    // 60px margin either side of a 600px poster leaves 480px of room.
    for (const size of sizes) {
      expect(size).toBeLessThanOrEqual(66);
    }

    const longestLine = Math.max(
      ...[...long.matchAll(/font-weight="700"[^>]*>([^<]+)</g)].map((m) => m[1].length)
    );
    expect(longestLine * sizes[0] * 0.62).toBeLessThanOrEqual(480);
  });

  it('stays small enough to sit in a document', () => {
    expect(Buffer.byteLength(poster, 'utf8')).toBeLessThan(8 * 1024);
  });
});
