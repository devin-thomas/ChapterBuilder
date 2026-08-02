import { describe, expect, it } from 'vitest';
import { buildEntryFromDraft, createEmptyDraft, importConfig, projectToConfig, validateConfig } from './project';

describe('project domain', () => {
  it('builds the desktop-compatible generated title', () => {
    const draft = createEmptyDraft();
    draft.round = 'Grand Final';
    draft.start = '1:00:00';
    draft.end = '1:10:00';
    draft.left.name = 'Player A';
    draft.right.name = 'Player B';
    const result = buildEntryFromDraft(draft, 1);
    expect(result.entry).toBeDefined();
    const config = projectToConfig({
      storageVersion: 1,
      tournamentName: 'Test Event',
      outputFolder: '',
      namingPattern: '',
      matches: [result.entry!],
      updatedAt: new Date(0).toISOString()
    });
    expect(config.chapters[0].name).toContain('Grand Final: Player A [Ahri/Akali; Freestyle] vs Player B');
    expect(validateConfig(config)).toEqual([]);
  });

  it('imports arbitrary VidChopper chapter names without losing them', () => {
    const project = importConfig({ chapters: [{ name: 'Awards and interview', start: '0:00', end: '2:00', outputName: 'awards' }] }, 'Event');
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
