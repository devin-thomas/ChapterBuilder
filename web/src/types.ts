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

export interface MatchSide {
  name: string;
  point: string;
  assist: string;
  fuse: string;
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
  storageVersion: 1;
  tournamentName: string;
  outputFolder: string;
  namingPattern: string;
  encoder?: VidChopperEncoderOptions;
  matches: MatchEntry[];
  updatedAt: string;
}

export interface MatchDraft {
  round: string;
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
