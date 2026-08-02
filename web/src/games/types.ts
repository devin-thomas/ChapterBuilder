import type {
  GameFieldValue,
  GameProfileId,
  ImplementedGameProfileId,
  MatchDraft,
  MatchEntry,
  MatchSide,
  ValidationIssue
} from '../types';

export type ProfileEditorKind = 'versus' | 'generic';
export type ProfileFieldKind = 'text' | 'select' | 'boolean';

export interface ProfileFieldDefinition {
  id: string;
  label: string;
  kind: ProfileFieldKind;
  options?: readonly string[];
  required?: boolean;
  allowCustomValue?: boolean;
  placeholder?: string;
  span?: 'half' | 'full';
  trueLabel?: string;
  defaultValue?: GameFieldValue;
}

export interface ParsedProfileMatch {
  round: string;
  left: MatchSide;
  right: MatchSide;
}

export interface GameProfileOption {
  id: GameProfileId;
  name: string;
  shortName: string;
  description: string;
  implemented: boolean;
}

export interface GameProfile extends GameProfileOption {
  id: ImplementedGameProfileId;
  implemented: true;
  version: number;
  editorKind: ProfileEditorKind;
  rounds: readonly string[];
  sideFields: readonly ProfileFieldDefinition[];
  createDefaultSide(side: 'left' | 'right'): MatchSide;
  buildGeneratedTitle(match: MatchEntry): string;
  outputNameParts(projectName: string, match: MatchEntry): string[];
  validateDraft(draft: MatchDraft): ValidationIssue[];
  validateMatch(match: MatchEntry): ValidationIssue[];
  parseGeneratedTitle?(title: string): ParsedProfileMatch | null;
}
