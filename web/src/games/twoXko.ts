import type { MatchDraft, MatchEntry, MatchSide, ValidationIssue } from '../types';
import type { GameProfile, ParsedProfileMatch } from './types';
import {
  fieldString,
  standardDoubleEliminationRounds,
  standardOutputNameParts,
  validateCompetitorNames,
  validateStoredCompetitorNames
} from './common';

export const twoXkoChampions = [
  'Ahri',
  'Akali',
  'Blitzcrank',
  'Braum',
  'Caitlyn',
  'Darius',
  'Ekko',
  'Illaoi',
  'Jinx',
  'Senna',
  'Teemo',
  'Thresh',
  'Vi',
  'Warwick',
  'Yasuo'
] as const;

export const twoXkoFuses = [
  'Double Down',
  '2X Assist',
  'Freestyle',
  'Juggernaut',
  'Sidekick',
  'Teamfight'
] as const;

const GENERATED_TITLE_PATTERN = /^(?:(?<round>.*?): )?(?<left>.*?) \[(?<leftPoint>[^/\]]+)\/(?<leftAssist>[^;\]]+); (?<leftFuse>[^\]]+)\] vs (?<right>.*?) \[(?<rightPoint>[^/\]]+)\/(?<rightAssist>[^;\]]+); (?<rightFuse>[^\]]+)\]$/;

function createSide(side: 'left' | 'right'): MatchSide {
  return {
    name: '',
    fields: {
      point: side === 'left' ? twoXkoChampions[0] : twoXkoChampions[2],
      assist: side === 'left' ? twoXkoChampions[1] : twoXkoChampions[3],
      fuse: 'Freestyle'
    }
  };
}

function validateSelections(left: MatchSide, right: MatchSide, matchId?: string, order?: number): ValidationIssue[] {
  const prefix = order ? `Chapter ${order}: ` : '';
  const issues: ValidationIssue[] = [];
  for (const [label, side] of [['Left', left], ['Right', right]] as const) {
    const point = fieldString(side, 'point');
    const assist = fieldString(side, 'assist');
    const fuse = fieldString(side, 'fuse');
    if (!point || !assist || !fuse) {
      issues.push({ severity: 'error', message: `${prefix}${label}-side Point, Assist, and Fuse are required.`, matchId });
    } else if (point === assist) {
      issues.push({ severity: 'error', message: `${prefix}${label}-side Point and Assist must be different.`, matchId });
    }
  }
  return issues;
}

function parseGeneratedTitle(title: string): ParsedProfileMatch | null {
  const parsed = GENERATED_TITLE_PATTERN.exec(title);
  if (!parsed?.groups) return null;
  return {
    round: parsed.groups.round ?? '',
    left: {
      name: parsed.groups.left,
      fields: {
        point: parsed.groups.leftPoint,
        assist: parsed.groups.leftAssist,
        fuse: parsed.groups.leftFuse
      }
    },
    right: {
      name: parsed.groups.right,
      fields: {
        point: parsed.groups.rightPoint,
        assist: parsed.groups.rightAssist,
        fuse: parsed.groups.rightFuse
      }
    }
  };
}

export const twoXkoProfile: GameProfile = {
  id: '2xko',
  version: 1,
  name: '2XKO',
  shortName: '2XKO',
  description: 'Two-player teams with Point, Assist, and Fuse selections.',
  implemented: true,
  editorKind: 'versus',
  rounds: standardDoubleEliminationRounds,
  sideFields: [
    { id: 'point', label: 'Point', kind: 'select', options: twoXkoChampions, required: true, span: 'half' },
    { id: 'assist', label: 'Assist', kind: 'select', options: twoXkoChampions, required: true, span: 'half' },
    { id: 'fuse', label: 'Fuse', kind: 'select', options: twoXkoFuses, required: true, span: 'full' }
  ],
  createDefaultSide: createSide,
  buildGeneratedTitle(match: MatchEntry): string {
    const round = match.round.trim() ? `${match.round.trim()}: ` : '';
    const left = match.left.fields;
    const right = match.right.fields;
    return `${round}${match.left.name.trim()} [${String(left.point)}/${String(left.assist)}; ${String(left.fuse)}] vs ${match.right.name.trim()} [${String(right.point)}/${String(right.assist)}; ${String(right.fuse)}]`;
  },
  outputNameParts: standardOutputNameParts,
  validateDraft(draft: MatchDraft): ValidationIssue[] {
    const names = validateCompetitorNames(draft);
    if (names.length || draft.nameOverride.trim()) return names;
    return validateSelections(draft.left, draft.right);
  },
  validateMatch(match: MatchEntry): ValidationIssue[] {
    const names = validateStoredCompetitorNames(match);
    if (names.length || match.nameOverride.trim()) return names;
    return validateSelections(match.left, match.right, match.id, match.order);
  },
  parseGeneratedTitle
};
