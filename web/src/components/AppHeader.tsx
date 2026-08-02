import { Brand } from './Brand';
import { DownloadIcon, FolderIcon, PlusIcon } from './Icons';

interface AppHeaderProps {
  title: string;
  profileName: string;
  saved: boolean;
  onNew: () => void;
  onOpen: () => void;
  onExport: () => void;
}

export function AppHeader({ title, profileName, saved, onNew, onOpen, onExport }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Brand />
      <div className="app-header__project">
        <strong>{title || 'Untitled project'}</strong>
        <span className="profile-chip">{profileName}</span>
        <span className={saved ? 'save-state save-state--saved' : 'save-state'}>
          <i /> {saved ? 'Saved locally' : 'Saving…'}
        </span>
      </div>
      <div className="app-header__actions">
        <button className="button button--ghost" onClick={onNew}><PlusIcon />New</button>
        <button className="button button--ghost" onClick={onOpen}><FolderIcon />Open</button>
        <button className="button button--primary" onClick={onExport}><DownloadIcon />Export JSON</button>
      </div>
    </header>
  );
}
