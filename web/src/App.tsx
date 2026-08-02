import { useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { ChapterTable } from './components/ChapterTable';
import { MatchEditor } from './components/MatchEditor';
import { ProjectSidebar } from './components/ProjectSidebar';
import { VideoPanel } from './components/VideoPanel';
import { downloadText, readJsonFile } from './domain/download';
import {
  buildEntryFromDraft,
  createEmptyDraft,
  createEmptyProject,
  importConfig,
  projectToConfig,
  renumber,
  safeFileName,
  totalDuration,
  tournamentNameFromFile,
  validateConfig
} from './domain/project';
import { clearStoredProject, loadProject, saveProject } from './domain/storage';
import { formatMilliseconds } from './domain/timecode';
import type { MatchDraft, MatchEntry, ProjectState } from './types';

function cloneDraftFromMatch(match: MatchEntry): MatchDraft {
  return {
    round: match.round,
    start: match.start,
    end: match.end,
    left: { ...match.left },
    right: { ...match.right }
  };
}

function preserveDraft(draft: MatchDraft, lastEnd: string, preserve: boolean): MatchDraft {
  if (!preserve) {
    return createEmptyDraft(lastEnd);
  }
  return {
    ...draft,
    start: lastEnd,
    end: '',
    left: { ...draft.left, name: '' },
    right: { ...draft.right, name: '' }
  };
}

export default function App() {
  const [project, setProject] = useState<ProjectState>(() => loadProject());
  const [draft, setDraft] = useState<MatchDraft>(() => createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keepSelections, setKeepSelections] = useState(true);
  const [status, setStatus] = useState('Ready. Your project is saved locally in this browser.');
  const [saved, setSaved] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const openProjectInput = useRef<HTMLInputElement>(null);
  const openVideoInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const config = useMemo(() => projectToConfig(project), [project]);
  const issues = useMemo(() => validateConfig(config), [config]);
  const duration = useMemo(() => totalDuration(project.matches), [project.matches]);

  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      const next = { ...project, updatedAt: new Date().toISOString() };
      saveProject(next);
      setSaved(true);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]') ?? false;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        exportJson();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        submitDraft();
        return;
      }
      if (!isTyping && event.key === '[') {
        event.preventDefault();
        usePlayhead('start');
      }
      if (!isTyping && event.key === ']') {
        event.preventDefault();
        usePlayhead('end');
      }
      if (!isTyping && event.code === 'Space' && videoRef.current) {
        event.preventDefault();
        if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const patchProject = (patch: Partial<ProjectState>) => setProject((current) => ({ ...current, ...patch }));

  const submitDraft = () => {
    const editingIndex = editingId ? project.matches.findIndex((match) => match.id === editingId) : -1;
    const result = buildEntryFromDraft(draft, editingIndex >= 0 ? project.matches[editingIndex].order : project.matches.length + 1, editingId ?? undefined);
    if (!result.entry) {
      setStatus(result.error ?? 'Could not build this chapter.');
      return;
    }

    let nextMatches: MatchEntry[];
    if (editingIndex >= 0) {
      const existing = project.matches[editingIndex];
      const updated = {
        ...result.entry,
        nameOverride: existing.nameOverride,
        outputNameOverride: existing.outputNameOverride
      };
      nextMatches = project.matches.map((match, index) => index === editingIndex ? updated : match);
      setStatus(`Updated chapter ${updated.order}.`);
    } else {
      nextMatches = [...project.matches, result.entry];
      setStatus(`Added chapter ${result.entry.order}: ${result.entry.left.name} vs ${result.entry.right.name}.`);
    }

    nextMatches = renumber(nextMatches);
    setProject((current) => ({ ...current, matches: nextMatches }));
    setSelectedId(result.entry.id);
    setEditingId(null);
    setDraft(preserveDraft(draft, result.entry.end, keepSelections));
  };

  const resetDraft = () => {
    setEditingId(null);
    setDraft(createEmptyDraft(project.matches.at(-1)?.end ?? ''));
    setStatus('Ready for a new chapter.');
  };

  const editSelected = () => {
    const match = project.matches.find((item) => item.id === selectedId);
    if (!match) return;
    setEditingId(match.id);
    setDraft(cloneDraftFromMatch(match));
    setStatus(`Editing chapter ${match.order}.`);
  };

  const templateSelected = () => {
    const match = project.matches.find((item) => item.id === selectedId);
    if (!match) return;
    const next = cloneDraftFromMatch(match);
    next.start = project.matches.at(-1)?.end ?? '';
    next.end = '';
    setEditingId(null);
    setDraft(next);
    setStatus(`Using chapter ${match.order} as a new-entry template.`);
  };

  const deleteSelected = () => {
    const match = project.matches.find((item) => item.id === selectedId);
    if (!match || !window.confirm(`Delete chapter ${match.order}?`)) return;
    setProject((current) => ({ ...current, matches: renumber(current.matches.filter((item) => item.id !== match.id)) }));
    setSelectedId(null);
    if (editingId === match.id) resetDraft();
    setStatus(`Deleted chapter ${match.order}.`);
  };

  const moveSelected = (delta: -1 | 1) => {
    const index = project.matches.findIndex((item) => item.id === selectedId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= project.matches.length) return;
    const next = [...project.matches];
    [next[index], next[target]] = [next[target], next[index]];
    setProject((current) => ({ ...current, matches: renumber(next) }));
  };

  const exportJson = () => {
    const errors = issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
      setStatus(`Resolve ${errors.length} export error${errors.length === 1 ? '' : 's'} first.`);
      return;
    }
    const base = safeFileName(project.tournamentName) || 'chapterbuilder-project';
    downloadText(`${JSON.stringify(config, null, 2)}\n`, `${base}-chapters.json`, 'application/json');
    setStatus(`Exported ${config.chapters.length} VidChopper chapters.`);
  };

  const exportYouTube = () => {
    if (project.matches.length === 0) {
      setStatus('Add at least one chapter before exporting YouTube timestamps.');
      return;
    }
    const lines = config.chapters.map((chapter) => `${typeof chapter.start === 'number' ? formatMilliseconds(chapter.start) : chapter.start} ${chapter.name}`);
    const base = safeFileName(project.tournamentName) || 'chapterbuilder-project';
    downloadText(`${lines.join('\n')}\n`, `${base}-youtube-chapters.txt`, 'text/plain');
    setStatus('Exported YouTube chapter timestamps.');
  };

  const newProject = () => {
    if (project.matches.length > 0 && !window.confirm('Start a new project and clear the locally saved chapter list?')) return;
    const next = createEmptyProject();
    clearStoredProject();
    setProject(next);
    setDraft(createEmptyDraft());
    setSelectedId(null);
    setEditingId(null);
    setStatus('Started a new project.');
  };

  const openProject = () => openProjectInput.current?.click();
  const openVideo = () => openVideoInput.current?.click();

  const importFile = async (file: File) => {
    try {
      const value = await readJsonFile(file);
      const imported = importConfig(value, tournamentNameFromFile(file.name));
      setProject(imported);
      setDraft(createEmptyDraft(imported.matches.at(-1)?.end ?? ''));
      setEditingId(null);
      setSelectedId(imported.matches[0]?.id ?? null);
      setStatus(`Opened ${file.name} with ${imported.matches.length} chapters.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open the chapter file.');
    }
  };

  const loadSample = async () => {
    try {
      const response = await fetch('/fixtures/tns-2xko-36-chapters.json');
      if (!response.ok) throw new Error('The sample fixture could not be loaded.');
      const imported = importConfig(await response.json(), 'TNS 2XKO #36');
      setProject(imported);
      setDraft(createEmptyDraft(imported.matches.at(-1)?.end ?? ''));
      setSelectedId(imported.matches[0]?.id ?? null);
      setEditingId(null);
      setStatus('Loaded the verified TNS 2XKO #36 compatibility fixture.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load the sample fixture.');
    }
  };

  const selectVideo = (file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setCurrentTimeMs(0);
    setStatus(`Opened ${file.name} locally. The file was not uploaded.`);
  };

  const usePlayhead = (field: 'start' | 'end') => {
    if (!videoRef.current) {
      setStatus('Choose a local video before capturing the playhead.');
      return;
    }
    const value = formatMilliseconds(videoRef.current.currentTime * 1000);
    setDraft((current) => ({ ...current, [field]: value }));
    setStatus(`Set ${field} to ${value}.`);
  };

  return (
    <div className="app-shell">
      <AppHeader title={project.tournamentName} saved={saved} onNew={newProject} onOpen={openProject} onExport={exportJson} />
      <main className="workspace">
        <ProjectSidebar
          project={project}
          issues={issues}
          videoName={videoName}
          onProjectChange={patchProject}
          onOpenProject={openProject}
          onLoadSample={() => void loadSample()}
          onOpenVideo={openVideo}
          onExportYouTube={exportYouTube}
          onClear={newProject}
        />
        <ChapterTable
          matches={project.matches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={resetDraft}
          onEdit={editSelected}
          onTemplate={templateSelected}
          onDelete={deleteSelected}
          onMove={moveSelected}
        />
        <MatchEditor
          draft={draft}
          editing={Boolean(editingId)}
          keepSelections={keepSelections}
          onDraftChange={setDraft}
          onKeepSelectionsChange={setKeepSelections}
          onSubmit={submitDraft}
          onCancel={resetDraft}
          onUsePlayhead={usePlayhead}
        />
        <VideoPanel ref={videoRef} videoUrl={videoUrl} videoName={videoName} currentTimeMs={currentTimeMs} onOpenVideo={openVideo} onTimeUpdate={setCurrentTimeMs} />
      </main>
      <footer className="status-bar">
        <span className={issues.some((issue) => issue.severity === 'error') ? 'status-bar__error' : 'status-bar__ok'}>{issues.some((issue) => issue.severity === 'error') ? 'Validation needs attention' : 'Validation OK'}</span>
        <span>Schema v1</span>
        <span>Total timeline {formatMilliseconds(duration)}</span>
        <span className="status-bar__message">{status}</span>
        <span>Autosave on</span>
      </footer>
      <input ref={openProjectInput} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ''; }} />
      <input ref={openVideoInput} type="file" accept="video/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) selectVideo(file); event.currentTarget.value = ''; }} />
    </div>
  );
}
