import { describe, expect, it } from 'vitest';
import {
  buildEntryFromDraft,
  createEmptyDraft,
  createEmptyProject,
  importConfig,
  importProjectFile,
  migrateLegacyProject,
  projectToConfig,
  projectToProjectFile,
  validateConfig
} from './project';

describe('project domain', () => {
  it('keeps the existing 2XKO title format', () => {
    const draft = createEmptyDraft('2xko');
    draft.round = 'Grand Final';
    draft.start = '1:00:00';
    draft.end = '1:10:00';
    draft.left.name = 'Player A';
    draft.right.name = 'Player B';
    const result = buildEntryFromDraft(draft, '2xko', 1);
    expect(result.entry).toBeDefined();

    const project = createEmptyProject('2xko');
    project.tournamentName = 'Test Event';
    project.matches = [result.entry!];
    const config = projectToConfig(project);

    expect(config.chapters[0].name).toContain('Grand Final: Player A [Ahri/Akali; Freestyle] vs Player B');
    expect(validateConfig(config)).toEqual([]);
  });

  it('stores SF6 Modern as a boolean and prefixes only the exported character', () => {
    const draft = createEmptyDraft('sf6');
    draft.start = '0:00';
    draft.end = '5:00';
    draft.left.name = 'Left Player';
    draft.right.name = 'Right Player';
    draft.left.fields.character = 'Ken';
    draft.left.fields.modern = true;
    draft.right.fields.character = 'Chun-Li';
    draft.right.fields.modern = false;

    const result = buildEntryFromDraft(draft, 'sf6', 1);
    expect(result.entry?.left.fields.modern).toBe(true);

    const project = createEmptyProject('sf6');
    project.matches = [result.entry!];
    expect(projectToConfig(project).chapters[0].name).toBe('Left Player [M-Ken] vs Right Player [Chun-Li]');
  });

  it('supports game-neutral chapters without fake competitors', () => {
    const draft = createEmptyDraft('generic');
    draft.nameOverride = 'Awards and interview';
    draft.outputNameOverride = 'awards';
    draft.start = '0:00';
    draft.end = '2:00';

    const result = buildEntryFromDraft(draft, 'generic', 1);
    expect(result.entry).toBeDefined();

    const project = createEmptyProject('generic');
    project.matches = [result.entry!];
    expect(projectToConfig(project).chapters[0]).toMatchObject({
      name: 'Awards and interview',
      outputName: 'awards'
    });
  });

  it('round-trips editable project metadata and typed fields', () => {
    const draft = createEmptyDraft('sf6');
    draft.start = '0:00';
    draft.end = '1:00';
    draft.left.name = 'A';
    draft.right.name = 'B';
    draft.left.fields.modern = true;
    const result = buildEntryFromDraft(draft, 'sf6', 1);
    const project = createEmptyProject('sf6');
    project.matches = [result.entry!];

    const reopened = importProjectFile(projectToProjectFile(project));
    expect(reopened.profile.id).toBe('sf6');
    expect(reopened.matches[0].left.fields.modern).toBe(true);
  });

  it('migrates browser projects from the original 2XKO-only storage format', () => {
    const migrated = migrateLegacyProject({
      storageVersion: 1,
      tournamentName: 'Legacy',
      outputFolder: '',
      namingPattern: '',
      updatedAt: new Date(0).toISOString(),
      matches: [{
        id: 'legacy-1',
        order: 1,
        round: 'Pools',
        nameOverride: '',
        outputNameOverride: '',
        start: '0:00',
        end: '1:00',
        left: { name: 'A', point: 'Ahri', assist: 'Akali', fuse: 'Freestyle' },
        right: { name: 'B', point: 'Ekko', assist: 'Vi', fuse: 'Freestyle' }
      }]
    });

    expect(migrated?.profile.id).toBe('2xko');
    expect(migrated?.matches[0].left.fields).toMatchObject({ point: 'Ahri', assist: 'Akali', fuse: 'Freestyle' });
  });

  it('imports arbitrary VidChopper names into the selected mode without losing them', () => {
    const project = importConfig(
      { chapters: [{ name: 'Awards and interview', start: '0:00', end: '2:00', outputName: 'awards' }] },
      'Event',
      'generic'
    );
    expect(project.matches[0].nameOverride).toBe('Awards and interview');
    expect(projectToConfig(project).chapters[0]).toMatchObject({ name: 'Awards and interview', outputName: 'awards' });
  });

  it('flags timeline gaps and overlaps', () => {
    const gap = validateConfig({ chapters: [
      { name: 'One', start: '0:00', end: '1:00' },
      { name: 'Two', start: '1:05', end: '2:00' }
    ] });
    expect(gap[0].severity).toBe('warning');

    const overlap = validateConfig({ chapters: [
      { name: 'One', start: '0:00', end: '1:00' },
      { name: 'Two', start: '0:55', end: '2:00' }
    ] });
    expect(overlap[0].severity).toBe('error');
  });
});
