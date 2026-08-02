import type { MatchDraft, MatchEntry, MatchSide, ValidationIssue } from '../types';
import type { GameProfile, ParsedProfileMatch } from './types';
import {
  fieldBoolean,
  fieldString,
  standardDoubleEliminationRounds,
  standardOutputNameParts,
  validateCompetitorNames,
  validateStoredCompetitorNames
} from './common';

// Playable roster through Ingrid on 2026-08-02. Character entry remains editable so newly released fighters work immediately.
export const streetFighter6Characters = [
  'Ryu', 'Luke', 'Jamie', 'Chun-Li', 'Guile', 'Kimberly', 'Juri', 'Ken', 'Blanka',
  'Dhalsim', 'E. Honda', 'Dee Jay', 'Manon', 'Marisa', 'JP', 'Zangief', 'Lily', 'Cammy',
  'Rashid', 'A.K.I.', 'Ed', 'Akuma', 'M. Bison', 'Terry', 'Mai', 'Elena',
  'Sagat', 'C. Viper', 'Alex', 'Ingrid'
] as const;

const GENERATED_TITLE_PATTERN = /^(?:(?<round>.*?): )?(?<left>.*?) \[(?<leftCharacter>[^\]]+)\] vs (?<right>.*?) \[(?<rightCharacter>[^\]]+)\]$/;

function createSide(side: 'left' | 'right'): MatchSide {
  return {
    name: '',
    fields: {
      character: side === 'left' ? 'Ryu' : 'Ken',
      modern: false
    }
  };
}

function displayCharacter(side: MatchSide): string {
  const character = fieldString(side, 'character');
  return fieldBoolean(side, 'modern') ? `M-${character}` : character;
}

function parseCharacter(value: string): { character: string; modern: boolean } {
  const modern = value.startsWith('M-');
  return { character: modern ? value.slice(2) : value, modern };
}

function validateCharacters(left: MatchSide, right: MatchSide, matchId?: string, order?: number): ValidationIssue[] {
  const prefix = order ? `Chapter ${order}: ` : '';
  const issues: ValidationIssue[] = [];
  if (!fieldString(left, 'character')) {
    issues.push({ severity: 'error', message: `${prefix}Left-side character is required.`, matchId });
  }
  if (!fieldString(right, 'character')) {
    issues.push({ severity: 'error', message: `${prefix}Right-side character is required.`, matchId });
  }
  return issues;
}

function parseGeneratedTitle(title: string): ParsedProfileMatch | null {
  const parsed = GENERATED_TITLE_PATTERN.exec(title);
  if (!parsed?.groups) return null;
  const leftCharacter = parseCharacter(parsed.groups.leftCharacter);
  const rightCharacter = parseCharacter(parsed.groups.rightCharacter);
  return {
    round: parsed.groups.round ?? '',
    left: { name: parsed.groups.left, fields: leftCharacter },
    right: { name: parsed.groups.right, fields: rightCharacter }
  };
}

export const streetFighter6Profile: GameProfile = {
  id: 'sf6',
  version: 1,
  name: 'Street Fighter 6',
  shortName: 'SF6',
  description: 'Single-character matches with an optional Modern-controls marker.',
  implemented: true,
  editorKind: 'versus',
  rounds: standardDoubleEliminationRounds,
  sideFields: [
    {
      id: 'character',
      label: 'Character',
      kind: 'select',
      options: streetFighter6Characters,
      required: true,
      allowCustomValue: true,
      placeholder: 'Choose or type a character',
      span: 'full'
    },
    {
      id: 'modern',
      label: 'Modern',
      trueLabel: 'Use Modern controls (exports as M-Character)',
      kind: 'boolean',
      defaultValue: false,
      span: 'full'
    }
  ],
  createDefaultSide: createSide,
  buildGeneratedTitle(match: MatchEntry): string {
    const round = match.round.trim() ? `${match.round.trim()}: ` : '';
    return `${round}${match.left.name.trim()} [${displayCharacter(match.left)}] vs ${match.right.name.trim()} [${displayCharacter(match.right)}]`;
  },
  outputNameParts: standardOutputNameParts,
  validateDraft(draft: MatchDraft): ValidationIssue[] {
    const names = validateCompetitorNames(draft);
    if (names.length || draft.nameOverride.trim()) return names;
    return validateCharacters(draft.left, draft.right);
  },
  validateMatch(match: MatchEntry): ValidationIssue[] {
    const names = validateStoredCompetitorNames(match);
    if (names.length || match.nameOverride.trim()) return names;
    return validateCharacters(match.left, match.right, match.id, match.order);
  },
  parseGeneratedTitle
};
