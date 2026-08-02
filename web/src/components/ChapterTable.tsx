import type { MatchEntry } from '../types';
import { buildTitle } from '../domain/project';
import { formatMilliseconds } from '../domain/timecode';
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, EditIcon, PlusIcon, TrashIcon } from './Icons';

interface ChapterTableProps {
  matches: MatchEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: () => void;
  onTemplate: () => void;
  onDelete: () => void;
  onMove: (delta: -1 | 1) => void;
}

export function ChapterTable({ matches, selectedId, onSelect, onAdd, onEdit, onTemplate, onDelete, onMove }: ChapterTableProps) {
  return (
    <section className="panel chapters-panel">
      <div className="panel__heading panel__heading--row">
        <span>Chapters <b>{matches.length}</b></span>
        <div className="icon-actions" aria-label="Chapter actions">
          <button title="Move up" onClick={() => onMove(-1)} disabled={!selectedId}><ArrowUpIcon /></button>
          <button title="Move down" onClick={() => onMove(1)} disabled={!selectedId}><ArrowDownIcon /></button>
          <button title="Edit" onClick={onEdit} disabled={!selectedId}><EditIcon /></button>
          <button title="Use as template" onClick={onTemplate} disabled={!selectedId}><CopyIcon /></button>
          <button title="Delete" onClick={onDelete} disabled={!selectedId}><TrashIcon /></button>
        </div>
      </div>
      <div className="chapter-table-wrap">
        <table className="chapter-table">
          <thead>
            <tr><th>#</th><th>Start</th><th>Chapter title</th><th>Duration</th></tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr
                key={match.id}
                className={selectedId === match.id ? 'is-selected' : ''}
                onClick={() => onSelect(match.id)}
                onDoubleClick={onEdit}
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && onSelect(match.id)}
              >
                <td>{match.order}</td>
                <td className="mono">{match.start}</td>
                <td><strong>{buildTitle(match)}</strong><span>{match.outputNameOverride || `${match.left.name} vs ${match.right.name}`}</span></td>
                <td className="mono">{formatMilliseconds(match.endMilliseconds - match.startMilliseconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {matches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon"><PlusIcon /></div>
            <strong>No chapters yet</strong>
            <span>Add the first match manually, load the included fixture, or open an existing VidChopper file.</span>
          </div>
        ) : null}
      </div>
      <button className="add-chapter-button" onClick={onAdd}><PlusIcon />Add chapter</button>
    </section>
  );
}
