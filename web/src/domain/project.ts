import type {
  MatchDraft,
  MatchEntry,
  MatchSide,
  ProjectState,
  ValidationIssue,
  VidChopperChapter,
  VidChopperChapterConfig
} from '../types';
import { champions, fuses } from '../data/gameProfile';
import { formatMilliseconds, parseTimecode } from './timecode';

export const VIDCHOPPER_SCHEMA_URL = 'https://vidchopper.dev/schemas/chapter-config.schema.json';

const GENERATED_TITLE_PATTERN = /^(?:(?<round>.*?): )?(?<left>.*?) \[(?<leftPoint>[^/\]]+)\/(?<leftAssist>[^;\]]+); (?<leftFuse>[^\]]+)\] vs (?<right>.*?) \[(?<rightPoint>[^/\]]+)\/(?<rightAssist>[^;\]]+); (?<rightFuse>[^\]]+)\]$/;

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `match-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSide(name: string = '', point: string = champions[0], assist: string = champions[1], fuse: string = fuses[2]): MatchSide {
  return { name, point, assist, fuse };
}

export function createEmptyDraft(lastEnd = ''): MatchDraft {
  return {
    round: '',
    start: lastEnd,
    end: '',
    left: createSide('', champions[0], champions[1], fuses[2]),
    right: createSide('', champions[2], champions[3], fuses[2])
  };
}

export function createEmptyProject(): ProjectState {
  return {
    storageVersion: 1,
    tournamentName: '',
    outputFolder: '',
    namingPattern: '',
    matches: [],
    updatedAt: new Date().toISOString()
  };
}

export function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildTitle(match: Pick<MatchEntry, 'round' | 'nameOverride' | 'left' | 'right'>): string {
  if (match.nameOverride.trim()) {
    return match.nameOverride.trim();
  }

  const round = match.round.trim() ? `${match.round.trim()}: ` : '';
  return `${round}${match.left.name.trim()} [${match.left.point}/${match.left.assist}; ${match.left.fuse}] vs ${match.right.name.trim()} [${match.right.point}/${match.right.assist}; ${match.right.fuse}]`;
}

export function buildOutputName(projectName: string, match: MatchEntry): string {
  if (match.outputNameOverride.trim()) {
    return match.outputNameOverride.trim();
  }

  return [
    safeFileName(projectName),
    String(match.order).padStart(2, '0'),
    safeFileName(match.round),
    safeFileName(match.left.name),
    'vs',
    safeFileName(match.right.name)
  ].filter(Boolean).join('-');
}

export interface DraftResult {
  entry?: MatchEntry;
  error?: string;
}

export function buildEntryFromDraft(draft: MatchDraft, order: number, existingId?: string): DraftResult {
  const leftName = draft.left.name.trim();
  const rightName = draft.right.name.trim();
  if (!leftName || !rightName) {
    return { error: 'Enter both player names.' };
  }
  if (draft.left.point === draft.left.assist) {
    return { error: 'The left-side point and assist characters must be different.' };
  }
  if (draft.right.point === draft.right.assist) {
    return { error: 'The right-side point and assist characters must be different.' };
  }

  const start = parseTimecode(draft.start);
  if (!start) {
    return { error: 'Start timestamp must look like 12:34, 12:34.500, or 1:12:34.' };
  }
  const end = parseTimecode(draft.end);
  if (!end) {
    return { error: 'End timestamp must look like 18:20, 18:20.250, or 1:18:20.' };
  }
  if (end.milliseconds <= start.milliseconds) {
    return { error: 'End timestamp must be later than the start timestamp.' };
  }

  return {
    entry: {
      id: existingId ?? createId(),
      order,
      round: draft.round.trim(),
      nameOverride: '',
      outputNameOverride: '',
      start: start.normalized,
      end: end.normalized,
      startMilliseconds: start.milliseconds,
      endMilliseconds: end.milliseconds,
      left: { ...draft.left, name: leftName },
      right: { ...draft.right, name: rightName }
    }
  };
}

export function renumber(matches: MatchEntry[]): MatchEntry[] {
  return matches.map((match, index) => ({ ...match, order: index + 1 }));
}

export function projectToConfig(project: ProjectState): VidChopperChapterConfig {
  const folder = project.outputFolder.trim();
  const namingPattern = project.namingPattern.trim();

  return {
    $schema: VIDCHOPPER_SCHEMA_URL,
    version: 1,
    output: folder || namingPattern
      ? {
          ...(folder ? { folder } : {}),
          ...(namingPattern ? { namingPattern } : {})
        }
      : undefined,
    encoder: project.encoder,
    chapters: renumber(project.matches).map((match) => ({
      name: buildTitle(match),
      start: match.start,
      end: match.end,
      outputName: buildOutputName(project.tournamentName, match) || undefined
    }))
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateConfig(config: VidChopperChapterConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(config.chapters) || config.chapters.length === 0) {
    issues.push({ severity: 'error', message: 'Add at least one chapter before exporting.' });
    return issues;
  }

  let previousEnd: number | null = null;
  config.chapters.forEach((chapter, index) => {
    const label = `Chapter ${index + 1}`;
    if (!chapter.name.trim()) {
      issues.push({ severity: 'error', message: `${label} needs a name.` });
    }
    const start = parseTimecode(chapter.start);
    const end = parseTimecode(chapter.end);
    if (!start || !end) {
      issues.push({ severity: 'error', message: `${label} contains an invalid timestamp.` });
      return;
    }
    if (end.milliseconds <= start.milliseconds) {
      issues.push({ severity: 'error', message: `${label} must end after it starts.` });
    }
    if (previousEnd !== null) {
      if (start.milliseconds < previousEnd) {
        issues.push({ severity: 'error', message: `${label} overlaps the previous chapter.` });
      } else if (start.milliseconds > previousEnd) {
        issues.push({ severity: 'warning', message: `${label} starts ${formatMilliseconds(start.milliseconds - previousEnd)} after the previous chapter ends.` });
      }
    }
    previousEnd = end.milliseconds;
  });

  return issues;
}

function chapterToMatch(chapter: VidChopperChapter, index: number): MatchEntry {
  const start = parseTimecode(chapter.start);
  const end = parseTimecode(chapter.end);
  if (!start || !end || end.milliseconds <= start.milliseconds) {
    throw new Error(`Chapter ${index + 1} contains an invalid time range.`);
  }
  if (!chapter.name.trim()) {
    throw new Error(`Chapter ${index + 1} has an empty name.`);
  }

  const parsed = GENERATED_TITLE_PATTERN.exec(chapter.name);
  if (parsed?.groups) {
    return {
      id: createId(),
      order: index + 1,
      round: parsed.groups.round ?? '',
      nameOverride: '',
      outputNameOverride: '',
      start: start.normalized,
      end: end.normalized,
      startMilliseconds: start.milliseconds,
      endMilliseconds: end.milliseconds,
      left: {
        name: parsed.groups.left,
        point: parsed.groups.leftPoint,
        assist: parsed.groups.leftAssist,
        fuse: parsed.groups.leftFuse
      },
      right: {
        name: parsed.groups.right,
        point: parsed.groups.rightPoint,
        assist: parsed.groups.rightAssist,
        fuse: parsed.groups.rightFuse
      }
    };
  }

  return {
    id: createId(),
    order: index + 1,
    round: '',
    nameOverride: chapter.name,
    outputNameOverride: chapter.outputName ?? '',
    start: start.normalized,
    end: end.normalized,
    startMilliseconds: start.milliseconds,
    endMilliseconds: end.milliseconds,
    left: createSide(chapter.name, champions[0], champions[1], fuses[2]),
    right: createSide('Imported chapter', champions[2], champions[3], fuses[2])
  };
}

export function importConfig(value: unknown, tournamentName = ''): ProjectState {
  if (!isObject(value) || !Array.isArray(value.chapters)) {
    throw new Error('This file is not a VidChopper chapter configuration.');
  }

  const config = value as unknown as VidChopperChapterConfig;
  const matches = config.chapters.map(chapterToMatch);
  if (matches.length === 0) {
    throw new Error('The chapter file does not contain any chapters.');
  }

  return {
    storageVersion: 1,
    tournamentName,
    outputFolder: config.output?.folder ?? '',
    namingPattern: config.output?.namingPattern ?? '',
    encoder: config.encoder,
    matches,
    updatedAt: new Date().toISOString()
  };
}

export function tournamentNameFromFile(fileName: string): string {
  const name = fileName.replace(/\.json$/i, '');
  const withoutSuffix = name.replace(/-chapters$/i, '');
  return withoutSuffix.replace(/-/g, ' ');
}

export function totalDuration(matches: MatchEntry[]): number {
  return matches.reduce((maximum, match) => Math.max(maximum, match.endMilliseconds), 0);
}
