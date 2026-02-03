/**
 * Unit tests — src/api/client.js
 * Tests the exported utility functions and interceptor logic.
 * axios itself is mocked; we test our wrappers, not axios internals.
 */
import { createFormData, buildQueryString } from '../api/client';

// ---------------------------------------------------------------------------
// buildQueryString
// ---------------------------------------------------------------------------
describe('buildQueryString', () => {
  it('returns empty string for empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('builds query string from simple key/value pairs', () => {
    const result = buildQueryString({ month: '2026-01', limit: 10 });
    expect(result).toMatch(/month=2026-01/);
    expect(result).toMatch(/limit=10/);
    expect(result).toMatch(/^\?/);
  });

  it('omits null, undefined, and empty-string values', () => {
    const result = buildQueryString({ a: 'hello', b: null, c: undefined, d: '' });
    expect(result).toBe('?a=hello');
  });

  it('handles a single param', () => {
    expect(buildQueryString({ id: '42' })).toBe('?id=42');
  });

  it('preserves numeric zero as a value', () => {
    const result = buildQueryString({ offset: 0 });
    expect(result).toBe('?offset=0');
  });
});

// ---------------------------------------------------------------------------
// createFormData
// ---------------------------------------------------------------------------
describe('createFormData', () => {
  it('creates FormData with string values', () => {
    const fd = createFormData({ report_month: '2026-01', meetings_held: '2' });
    expect(fd.get('report_month')).toBe('2026-01');
    expect(fd.get('meetings_held')).toBe('2');
  });

  it('skips null and undefined values', () => {
    const fd = createFormData({ a: 'keep', b: null, c: undefined });
    expect(fd.get('a')).toBe('keep');
    expect(fd.get('b')).toBeNull();
    expect(fd.get('c')).toBeNull();
  });

  it('appends array items with indexed keys', () => {
    const fd = createFormData({ tags: ['x', 'y', 'z'] });
    expect(fd.get('tags[0]')).toBe('x');
    expect(fd.get('tags[1]')).toBe('y');
    expect(fd.get('tags[2]')).toBe('z');
  });

  it('appends File/Blob objects directly', () => {
    const blob = new Blob(['content'], { type: 'audio/mp3' });
    const fd = createFormData({ voice_note: blob });
    // FormData stores blobs; get() returns a File in jsdom
    expect(fd.get('voice_note')).toBeTruthy();
  });

  it('converts numbers to strings', () => {
    const fd = createFormData({ count: 42 });
    expect(fd.get('count')).toBe('42');
  });
});
