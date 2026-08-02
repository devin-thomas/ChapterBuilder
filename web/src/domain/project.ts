import type {
  GameFieldValue,
  ImplementedGameProfileId,
  MatchDraft,
  MatchEntry,
  MatchSide,
  ProjectState,
  ValidationIssue,
  VidChopperChapter,
  VidChopperChapterConfig
} from '../types';
import { getGameProfile, isImplementedGameProfileId } from '../games/registry';
import type { GameProfile } from '../games/types';
import { formatMilliseconds, parseTimecode } from './timecode';

export const VIDCHOPPER_SCHEMA_URL = 'https://vidchopper.dev/schemas/chapter-config.schema.json';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `match-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneSide(side: MatchSide): MatchSide {
  return { name: side.name, fields: { ...side.fields } };
}

export function createEmptyDraft(profileId: ImplementedGameProfileId = '2xko', lastEnd = ''): MatchDraft {
  const profile = getGameProfile(profileId);
  return {
    round: '',
    nameOverride: '',
    outputNameOverride: '',
    start: lastEnd,
    end: '',
    left: profile.createDefaultSide('left'),
    right: profile.createDefaultSide('right')
  };
}

export function createEmptyProject(profileId: ImplementedGameProfileId = '2xko'): ProjectState {
  const profile = getGameProfile(profileId);
  return {
    kind: 'chapterbuilder-project',
    storageVersion: 2,
    profile: { id: profile.id, version: profile.version },
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

export function buildTitle(match: MatchEntry, profile: GameProfile): string {
  return match.nameOverride.trim() || profile.buildGeneratedTitle(match);
}

export function buildOutputName(project: ProjectState, match: MatchEntry): string {
  if (match.outputNameOverride.trim()) {
    return match.outputNameOverride.trim();
  }
  const profile = getGameProfile(project.profile.id);
  return profile
    .outputNameParts(project.tournamentName, match)
    .map(safeFileName)
    .filter(Boolean)
    .join('-');
}

export interface DraftResult {
  entry?: MatchEntry;
  error?: string;
}

export function buildEntryFromDraft(
  draft: MatchDraft,
  profileId: ImplementedGameProfileId,
  order: number,
  existingId?: string
): DraftResult {
  const profile = getGameProfile(profileId);
  const profileError = profile.validateDraft(draft).find((issue) => issue.severity === 'error');
  if (profileError) return { error: profileError.message };

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
      nameOverride: draft.nameOverride.trim(),
      outputNameOverride: draft.outputNameOverride.trim(),
      start: start.normalized,
      end: end.normalized,
      startMilliseconds: start.milliseconds,
      endMilliseconds: end.milliseconds,
      left: { ...cloneSide(draft.left), name: draft.left.name.trim() },
      right: { ...cloneSide(draft.right), name: draft.right.name.trim() }
    }
  };
}

export function renumber(matches: MatchEntry[]): MatchEntry[] {
  return matches.map((match, index) => ({ ...match, order: index + 1 }));
}

export function projectToConfig(project: ProjectState): VidChopperChapterConfig {
  const folder = project.outputFolder.trim();
  const namingPattern = project.namingPattern.trim();
  const profile = getGameProfile(project.profile.id);

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
      name: buildTitle(match, profile),
      start: match.start,
      end: match.end,
      outputName: buildOutputName(project, match) || undefined
    }))
  };
}

export function projectToProjectFile(project: ProjectState): ProjectState {
  const profile = getGameProfile(project.profile.id);
  return {
    ...project,
    kind: 'chapterbuilder-project',
    storageVersion: 2,
    profile: { id: profile.id, version: profile.version },
    matches: renumber(project.matches).map((match) => ({
      ...match,
      left: cloneSide(match.left),
      right: cloneSide(match.right)
    })),
    updatedAt: new Date().toISOString()
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

export function validateProject(project: ProjectState): ValidationIssue[] {
  const profile = getGameProfile(project.profile.id);
  const profileIssues = project.matches.flatMap((match) => profile.validateMatch(match));
  return [...profileIssues, ...validateConfig(projectToConfig(project))];
}

function chapterToMatch(chapter: VidChopperChapter, index: number, profile: GameProfile): MatchEntry {
  const start = parseTimecode(chapter.start);
  const end = parseTimecode(chapter.end);
  if (!start || !end || end.milliseconds <= start.milliseconds) {
    throw new Error(`Chapter ${index + 1} contains an invalid time range.`);
  }
  if (!chapter.name.trim()) {
    throw new Error(`Chapter ${index + 1} has an empty name.`);
  }

  const parsed = profile.parseGeneratedTitle?.(chapter.name) ?? null;
  const left = parsed?.left ?? profile.createDefaultSide('left');
  const right = parsed?.right ?? profile.createDefaultSide('right');

  return {
    id: createId(),
    order: index + 1,
    round: parsed?.round ?? '',
    nameOverride: parsed ? '' : chapter.name,
    outputNameOverride: parsed ? '' : chapter.outputName ?? '',
    start: start.normalized,
    end: end.normalized,
    startMilliseconds: start.milliseconds,
    endMilliseconds: end.milliseconds,
    left,
    right
  };
}

export function importConfig(
  value: unknown,
  tournamentName = '',
  profileId: ImplementedGameProfileId = '2xko'
): ProjectState {
  if (!isObject(value) || !Array.isArray(value.chapters)) {
    throw new Error('This file is not a VidChopper chapter configuration.');
  }

  const config = value as unknown as VidChopperChapterConfig;
  const profile = getGameProfile(profileId);
  const matches = config.chapters.map((chapter, index) => chapterToMatch(chapter, index, profile));
  if (matches.length === 0) {
    throw new Error('The chapter file does not contain any chapters.');
  }

  return {
    kind: 'chapterbuilder-project',
    storageVersion: 2,
    profile: { id: profile.id, version: profile.version },
    tournamentName,
    outputFolder: config.output?.folder ?? '',
    namingPattern: config.output?.namingPattern ?? '',
    encoder: config.encoder,
    matches,
    updatedAt: new Date().toISOString()
  };
}

function normalizeFieldValue(value: unknown): GameFieldValue | undefined {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  return undefined;
}

function normalizeSide(value: unknown, fallback: MatchSide): MatchSide {
  if (!isObject(value)) return fallback;
  const rawFields = isObject(value.fields) ? value.fields : {};
  const fields: Record<string, GameFieldValue> = {};
  Object.entries(rawFields).forEach(([key, raw]) => {
    const normalized = normalizeFieldValue(raw);
    if (normalized !== undefined) fields[key] = normalized;
  });
  return {
    name: typeof value.name === 'string' ? value.name : fallback.name,
    fields: { ...fallback.fields, ...fields }
  };
}

function normalizeProjectMatch(value: unknown, index: number, profile: GameProfile): MatchEntry {
  if (!isObject(value)) throw new Error(`Project chapter ${index + 1} is invalid.`);
  const start = parseTimecode(value.start as string | number);
  const end = parseTimecode(value.end as string | number);
  if (!start || !end || end.milliseconds <= start.milliseconds) {
    throw new Error(`Project chapter ${index + 1} contains an invalid time range.`);
  }
  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    order: index + 1,
    round: typeof value.round === 'string' ? value.round : '',
    nameOverride: typeof value.nameOverride === 'string' ? value.nameOverride : '',
    outputNameOverride: typeof value.outputNameOverride === 'string' ? value.outputNameOverride : '',
    start: start.normalized,
    end: end.normalized,
    startMilliseconds: start.milliseconds,
    endMilliseconds: end.milliseconds,
    left: normalizeSide(value.left, profile.createDefaultSide('left')),
    right: normalizeSide(value.right, profile.createDefaultSide('right'))
  };
}

export function isChapterBuilderProject(value: unknown): boolean {
  return isObject(value) && value.kind === 'chapterbuilder-project';
}

export function importProjectFile(value: unknown): ProjectState {
  if (!isObject(value) || value.kind !== 'chapterbuilder-project' || value.storageVersion !== 2) {
    throw new Error('This file is not a supported ChapterBuilder project.');
  }
  if (!isObject(value.profile) || !isImplementedGameProfileId(value.profile.id)) {
    throw new Error('This project uses an unavailable game profile.');
  }
  if (!Array.isArray(value.matches)) {
    throw new Error('This ChapterBuilder project has no valid chapter list.');
  }

  const profile = getGameProfile(value.profile.id);
  return {
    kind: 'chapterbuilder-project',
    storageVersion: 2,
    profile: { id: profile.id, version: profile.version },
    tournamentName: typeof value.tournamentName === 'string' ? value.tournamentName : '',
    outputFolder: typeof value.outputFolder === 'string' ? value.outputFolder : '',
    namingPattern: typeof value.namingPattern === 'string' ? value.namingPattern : '',
    encoder: isObject(value.encoder) ? value.encoder : undefined,
    matches: value.matches.map((match, index) => normalizeProjectMatch(match, index, profile)),
    updatedAt: new Date().toISOString()
  } as ProjectState;
}

export function migrateLegacyProject(value: unknown): ProjectState | null {
  if (!isObject(value) || value.storageVersion !== 1 || !Array.isArray(value.matches)) return null;
  const profile = getGameProfile('2xko');
  const matches = value.matches.map((raw, index) => {
    if (!isObject(raw)) throw new Error(`Legacy chapter ${index + 1} is invalid.`);
    const legacySide = (sideValue: unknown, fallback: MatchSide): MatchSide => {
      if (!isObject(sideValue)) return fallback;
      return {
        name: typeof sideValue.name === 'string' ? sideValue.name : '',
        fields: {
          point: typeof sideValue.point === 'string' ? sideValue.point : fallback.fields.point,
          assist: typeof sideValue.assist === 'string' ? sideValue.assist : fallback.fields.assist,
          fuse: typeof sideValue.fuse === 'string' ? sideValue.fuse : fallback.fields.fuse
        }
      };
    };
    const start = parseTimecode(raw.start as string | number);
    const end = parseTimecode(raw.end as string | number);
    if (!start || !end || end.milliseconds <= start.milliseconds) {
      throw new Error(`Legacy chapter ${index + 1} contains an invalid time range.`);
    }
    return {
      id: typeof raw.id === 'string' ? raw.id : createId(),
      order: index + 1,
      round: typeof raw.round === 'string' ? raw.round : '',
      nameOverride: typeof raw.nameOverride === 'string' ? raw.nameOverride : '',
      outputNameOverride: typeof raw.outputNameOverride === 'string' ? raw.outputNameOverride : '',
      start: start.normalized,
      end: end.normalized,
      startMilliseconds: start.milliseconds,
      endMilliseconds: end.milliseconds,
      left: legacySide(raw.left, profile.createDefaultSide('left')),
      right: legacySide(raw.right, profile.createDefaultSide('right'))
    } satisfies MatchEntry;
  });

  return {
    kind: 'chapterbuilder-project',
    storageVersion: 2,
    profile: { id: '2xko', version: profile.version },
    tournamentName: typeof value.tournamentName === 'string' ? value.tournamentName : '',
    outputFolder: typeof value.outputFolder === 'string' ? value.outputFolder : '',
    namingPattern: typeof value.namingPattern === 'string' ? value.namingPattern : '',
    encoder: isObject(value.encoder) ? value.encoder : undefined,
    matches,
    updatedAt: new Date().toISOString()
  } as ProjectState;
}

export function tournamentNameFromFile(fileName: string): string {
  const name = fileName.replace(/\.chapterbuilder\.json$/i, '').replace(/\.json$/i, '');
  const withoutSuffix = name.replace(/-chapters$/i, '');
  return withoutSuffix.replace(/-/g, ' ');
}

export function totalDuration(matches: MatchEntry[]): number {
  return matches.reduce((maximum, match) => Math.max(maximum, match.endMilliseconds), 0);
}
