const TIMECODE_PATTERN = /^(?:(?<hours>[0-9]+):)?(?<minutes>[0-5]?[0-9]):(?<seconds>[0-5][0-9])(?:\.(?<fraction>[0-9]{1,3}))?$/;

export interface ParsedTimecode {
  milliseconds: number;
  normalized: string;
}

export function formatMilliseconds(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError('Milliseconds must be a non-negative finite number.');
  }

  const rounded = Math.round(milliseconds);
  const totalSeconds = Math.floor(rounded / 1000);
  const fraction = rounded % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const base = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  if (fraction === 0) {
    return base;
  }

  return `${base}.${String(fraction).padStart(3, '0').replace(/0+$/, '')}`;
}

export function parseTimecode(input: string | number): ParsedTimecode | null {
  if (typeof input === 'number') {
    if (!Number.isInteger(input) || input < 0) {
      return null;
    }
    return { milliseconds: input, normalized: formatMilliseconds(input) };
  }

  const match = TIMECODE_PATTERN.exec(input.trim());
  if (!match?.groups) {
    return null;
  }

  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes);
  const seconds = Number(match.groups.seconds);
  const fraction = match.groups.fraction ?? '';
  const fractionMilliseconds = fraction.length === 0
    ? 0
    : Number(fraction.padEnd(3, '0'));
  const milliseconds = ((hours * 3600) + (minutes * 60) + seconds) * 1000 + fractionMilliseconds;

  return { milliseconds, normalized: formatMilliseconds(milliseconds) };
}

export function formatDuration(milliseconds: number): string {
  const formatted = formatMilliseconds(milliseconds);
  return formatted.includes(':') ? formatted : `0:${formatted}`;
}
