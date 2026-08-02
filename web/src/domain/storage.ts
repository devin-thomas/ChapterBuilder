import type { ProjectState } from '../types';
import { createEmptyProject } from './project';

const STORAGE_KEY = 'chapterbuilder.project.v1';

export function loadProject(): ProjectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyProject();
    }
    const parsed = JSON.parse(raw) as ProjectState;
    if (parsed.storageVersion !== 1 || !Array.isArray(parsed.matches)) {
      return createEmptyProject();
    }
    return parsed;
  } catch {
    return createEmptyProject();
  }
}

export function saveProject(project: ProjectState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function clearStoredProject(): void {
  localStorage.removeItem(STORAGE_KEY);
}
