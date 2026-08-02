import type { ProjectState } from '../types';
import { createEmptyProject, importProjectFile, migrateLegacyProject, projectToProjectFile } from './project';

const STORAGE_KEY = 'chapterbuilder.project.v2';
const LEGACY_STORAGE_KEY = 'chapterbuilder.project.v1';

export function loadProject(): ProjectState {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return importProjectFile(JSON.parse(current) as unknown);

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = migrateLegacyProject(JSON.parse(legacy) as unknown);
      if (migrated) {
        saveProject(migrated);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
    }
  } catch {
    // A malformed local draft should never prevent the app from opening.
  }
  return createEmptyProject();
}

export function saveProject(project: ProjectState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projectToProjectFile(project)));
}

export function clearStoredProject(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
