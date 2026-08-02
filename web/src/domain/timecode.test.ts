import { describe, expect, it } from 'vitest';
import { formatMilliseconds, parseTimecode } from './timecode';

describe('timecodes', () => {
  it('matches the desktop parser formats', () => {
    expect(parseTimecode('12:34.5')).toEqual({ milliseconds: 754500, normalized: '12:34.5' });
    expect(parseTimecode('1:02:03.045')).toEqual({ milliseconds: 3723045, normalized: '1:02:03.045' });
    expect(parseTimecode(1200)).toEqual({ milliseconds: 1200, normalized: '0:01.2' });
  });

  it('rejects invalid ranges', () => {
    expect(parseTimecode('12:99')).toBeNull();
    expect(parseTimecode(-1)).toBeNull();
  });

  it('formats hours and trimmed fractions', () => {
    expect(formatMilliseconds(0)).toBe('0:00');
    expect(formatMilliseconds(3600120)).toBe('1:00:00.12');
  });
});
