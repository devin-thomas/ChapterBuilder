import type { MatchDraft, MatchEntry, MatchSide, ValidationIssue } from '../types';
import type { GameProfile } from './types';

function createSide(): MatchSide {
  return { name: '', fields: {} };
}

export const genericProfile: GameProfile = {
  id: 'generic',
  version: 1,
  name: 'Generic chapters',
  shortName: 'Generic',
  description: 'Game-neutral or non-game video chapters with a title and time range.',
  implemented: true,
  editorKind: 'generic',
  rounds: [],
  sideFields: [],
  createDefaultSide: createSide,
  buildGeneratedTitle(match: MatchEntry): string {
    return match.nameOverride.trim() || `Chapter ${match.order}`;
  },
  outputNameParts(projectName: string, match: MatchEntry): string[] {
    return [projectName, String(match.order).padStart(2, '0'), match.nameOverride];
  },
  validateDraft(draft: MatchDraft): ValidationIssue[] {
    return draft.nameOverride.trim()
      ? []
      : [{ severity: 'error', message: 'Enter a chapter title.' }];
  },
  validateMatch(match: MatchEntry): ValidationIssue[] {
    return match.nameOverride.trim()
      ? []
      : [{ severity: 'error', message: `Chapter ${match.order} needs a title.`, matchId: match.id }];
  }
};
