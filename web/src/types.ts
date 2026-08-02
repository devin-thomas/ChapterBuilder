export interface VidChopperOutputOptions {
  folder?: string;
  namingPattern?: string;
}

export interface VidChopperEncoderOptions {
  crf?: number;
  cq?: number;
  preset?: string;
  threads?: number;
}

export interface VidChopperChapter {
  name: string;
  start: string | number;
  end: string | number;
  outputName?: string;
}

export interface VidChopperChapterConfig {
  $schema?: string;
  version?: 1;
  output?: VidChopperOutputOptions;
  encoder?: VidChopperEncoderOptions;
  chapters: VidChopperChapter[];
}

export type GameProfileId =
  | '2xko'
  | 'sf6'
  | 'generic'
  | 'marvel-tokon'
  | 'avatar-legends'
  | 'guilty-gear-strive';

export type ImplementedGameProfileId = '2xko' | 'sf6' | 'generic';
export type GameFieldValue = string | boolean;

export interface GameProfileRef {
  id: ImplementedGameProfileId;
  version: number;
}

export interface MatchSide {
  name: string;
  fields: Record<string, GameFieldValue>;
}

export interface MatchEntry {
  id: string;
  order: number;
  round: string;
  nameOverride: string;
  outputNameOverride: string;
  start: string;
  end: string;
  startMilliseconds: number;
  endMilliseconds: number;
  left: MatchSide;
  right: MatchSide;
}

export interface ProjectState {
  kind: 'chapterbuilder-project';
  storageVersion: 2;
  profile: GameProfileRef;
  tournamentName: string;
  outputFolder: string;
  namingPattern: string;
  encoder?: VidChopperEncoderOptions;
  matches: MatchEntry[];
  updatedAt: string;
}

export interface MatchDraft {
  round: string;
  nameOverride: string;
  outputNameOverride: string;
  start: string;
  end: string;
  left: MatchSide;
  right: MatchSide;
}

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
  matchId?: string;
}
