import type { MatchDraft, MatchEntry, MatchSide, ValidationIssue } from '../types';

export const standardDoubleEliminationRounds = [
  'Pools',
  'Winners Round',
  'Losers Round',
  'Top 24',
  'Top 16',
  'Top 8',
  'Winners Semifinal',
  'Losers Quarterfinal',
  'Winners Final',
  'Losers Semifinal',
  'Losers Final',
  'Grand Final',
  'Grand Final Reset'
] as const;

export function fieldString(side: MatchSide, id: string): string {
  const value = side.fields[id];
  return typeof value === 'string' ? value.trim() : '';
}

export function fieldBoolean(side: MatchSide, id: string): boolean {
  return side.fields[id] === true;
}

export function standardOutputNameParts(projectName: string, match: MatchEntry): string[] {
  return [projectName, String(match.order).padStart(2, '0'), match.round, match.left.name, 'vs', match.right.name];
}

export function validateCompetitorNames(draft: MatchDraft): ValidationIssue[] {
  if (draft.nameOverride.trim()) return [];
  if (!draft.left.name.trim() || !draft.right.name.trim()) {
    return [{ severity: 'error', message: 'Enter both player names, or provide a custom chapter title.' }];
  }
  return [];
}

export function validateStoredCompetitorNames(match: MatchEntry): ValidationIssue[] {
  if (match.nameOverride.trim()) return [];
  if (!match.left.name.trim() || !match.right.name.trim()) {
    return [{ severity: 'error', message: `Chapter ${match.order} needs both player names or a custom title.`, matchId: match.id }];
  }
  return [];
}
