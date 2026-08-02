import type { ProjectState, ValidationIssue } from '../types';
import { AlertIcon, CheckIcon, DownloadIcon, FolderIcon, ResetIcon, VideoIcon } from './Icons';

interface ProjectSidebarProps {
  project: ProjectState;
  issues: ValidationIssue[];
  videoName: string;
  onProjectChange: (patch: Partial<ProjectState>) => void;
  onOpenProject: () => void;
  onLoadSample: () => void;
  onOpenVideo: () => void;
  onExportYouTube: () => void;
  onClear: () => void;
}

export function ProjectSidebar({
  project,
  issues,
  videoName,
  onProjectChange,
  onOpenProject,
  onLoadSample,
  onOpenVideo,
  onExportYouTube,
  onClear
}: ProjectSidebarProps) {
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;

  return (
    <aside className="sidebar">
      <section className="panel panel--sidebar">
        <div className="panel__heading"><span>Project</span></div>
        <label className="field">
          <span>Tournament / event</span>
          <input value={project.tournamentName} onChange={(event) => onProjectChange({ tournamentName: event.target.value })} placeholder="TNS 2XKO #36" />
        </label>
        <label className="field">
          <span>Output folder <em>optional</em></span>
          <input value={project.outputFolder} onChange={(event) => onProjectChange({ outputFolder: event.target.value })} placeholder="matches/top-8" />
        </label>
        <label className="field">
          <span>Naming pattern <em>optional</em></span>
          <input value={project.namingPattern} onChange={(event) => onProjectChange({ namingPattern: event.target.value })} placeholder="{index}-{name}" />
        </label>
        <div className="stacked-actions">
          <button className="button button--primary button--full" onClick={onLoadSample}>Load sample fixture</button>
          <button className="button button--ghost button--full" onClick={onOpenProject}><FolderIcon />Open chapter file</button>
        </div>
      </section>

      <section className="panel panel--sidebar">
        <div className="panel__heading"><span>Local video</span></div>
        <div className="video-file-state">
          <VideoIcon />
          <span>{videoName || 'No video selected'}</span>
        </div>
        <button className="button button--ghost button--full" onClick={onOpenVideo}><FolderIcon />Choose video</button>
        <p className="microcopy">The video stays on this device. It is never uploaded.</p>
      </section>

      <section className="panel panel--sidebar">
        <div className="panel__heading"><span>Validation</span></div>
        <div className={errors ? 'validation-summary validation-summary--error' : 'validation-summary'}>
          {errors ? <AlertIcon /> : <CheckIcon />}
          <div>
            <strong>{errors ? `${errors} error${errors === 1 ? '' : 's'}` : 'Ready to export'}</strong>
            <span>{warnings ? `${warnings} timeline warning${warnings === 1 ? '' : 's'}` : 'Schema and ranges look good'}</span>
          </div>
        </div>
        {issues.length > 0 ? (
          <ul className="issue-list">
            {issues.slice(0, 4).map((issue, index) => <li key={`${issue.message}-${index}`} className={`issue issue--${issue.severity}`}>{issue.message}</li>)}
          </ul>
        ) : null}
      </section>

      <section className="panel panel--sidebar">
        <div className="panel__heading"><span>More exports</span></div>
        <button className="button button--ghost button--full" onClick={onExportYouTube}><DownloadIcon />YouTube chapters</button>
        <button className="button button--danger button--full" onClick={onClear}><ResetIcon />Clear project</button>
      </section>
    </aside>
  );
}
