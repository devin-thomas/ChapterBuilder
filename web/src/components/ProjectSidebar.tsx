import { gameProfileOptions, getGameProfile } from '../games/registry';
import type { ImplementedGameProfileId, ProjectState, ValidationIssue } from '../types';
import { AlertIcon, CheckIcon, DownloadIcon, FolderIcon, ResetIcon, VideoIcon } from './Icons';

interface ProjectSidebarProps {
  project: ProjectState;
  issues: ValidationIssue[];
  videoName: string;
  onProjectChange: (patch: Partial<ProjectState>) => void;
  onProfileChange: (profileId: ImplementedGameProfileId) => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
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
  onProfileChange,
  onOpenProject,
  onSaveProject,
  onLoadSample,
  onOpenVideo,
  onExportYouTube,
  onClear
}: ProjectSidebarProps) {
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  const activeProfile = getGameProfile(project.profile.id);
  const available = gameProfileOptions.filter((profile) => profile.implemented);
  const planned = gameProfileOptions.filter((profile) => !profile.implemented);

  return (
    <aside className="sidebar">
      <section className="panel panel--sidebar">
        <div className="panel__heading"><span>Project</span></div>
        <label className="field">
          <span>Mode</span>
          <select
            value={project.profile.id}
            onChange={(event) => onProfileChange(event.target.value as ImplementedGameProfileId)}
          >
            <optgroup label="Available">
              {available.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </optgroup>
            <optgroup label="Planned">
              {planned.map((profile) => <option key={profile.id} value={profile.id} disabled>{profile.name} — coming later</option>)}
            </optgroup>
          </select>
        </label>
        <p className="microcopy profile-description">{activeProfile.description}</p>
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
          <button className="button button--primary button--full" onClick={onLoadSample} disabled={project.profile.id !== '2xko'}>Load 2XKO sample fixture</button>
          <button className="button button--ghost button--full" onClick={onOpenProject}><FolderIcon />Open project or chapters</button>
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
        <div className="stacked-actions">
          <button className="button button--ghost button--full" onClick={onSaveProject}><DownloadIcon />Editable project</button>
          <button className="button button--ghost button--full" onClick={onExportYouTube}><DownloadIcon />YouTube chapters</button>
          <button className="button button--danger button--full" onClick={onClear}><ResetIcon />Clear project</button>
        </div>
      </section>
    </aside>
  );
}
