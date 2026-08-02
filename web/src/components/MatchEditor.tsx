import type { MatchDraft, MatchSide } from '../types';
import { champions, fuses, rounds } from '../data/gameProfile';
import { SwapIcon } from './Icons';

interface MatchEditorProps {
  draft: MatchDraft;
  editing: boolean;
  keepSelections: boolean;
  onDraftChange: (draft: MatchDraft) => void;
  onKeepSelectionsChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onUsePlayhead: (field: 'start' | 'end') => void;
}

function SideFields({ label, side, onChange }: { label: string; side: MatchSide; onChange: (side: MatchSide) => void }) {
  return (
    <fieldset className="side-fields">
      <legend>{label}</legend>
      <label className="field"><span>Player</span><input value={side.name} onChange={(event) => onChange({ ...side, name: event.target.value })} placeholder={label === 'Left side' ? 'Player 1' : 'Player 2'} /></label>
      <div className="field-row">
        <label className="field"><span>Point</span><select value={side.point} onChange={(event) => onChange({ ...side, point: event.target.value })}>{champions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Assist</span><select value={side.assist} onChange={(event) => onChange({ ...side, assist: event.target.value })}>{champions.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="field"><span>Fuse</span><select value={side.fuse} onChange={(event) => onChange({ ...side, fuse: event.target.value })}>{fuses.map((item) => <option key={item}>{item}</option>)}</select></label>
    </fieldset>
  );
}

export function MatchEditor({ draft, editing, keepSelections, onDraftChange, onKeepSelectionsChange, onSubmit, onCancel, onUsePlayhead }: MatchEditorProps) {
  const swapSides = () => onDraftChange({ ...draft, left: draft.right, right: draft.left });

  return (
    <section className="panel editor-panel">
      <div className="panel__heading panel__heading--row"><span>{editing ? 'Edit chapter' : 'Chapter editor'}</span><kbd>Ctrl ↵</kbd></div>
      <label className="field">
        <span>Round / bracket label</span>
        <input list="round-options" value={draft.round} onChange={(event) => onDraftChange({ ...draft, round: event.target.value })} placeholder="Pools, Top 8, Grand Final…" />
        <datalist id="round-options">{rounds.map((round) => <option key={round} value={round} />)}</datalist>
      </label>

      <div className="sides-grid">
        <SideFields label="Left side" side={draft.left} onChange={(left) => onDraftChange({ ...draft, left })} />
        <button className="swap-button" type="button" onClick={swapSides} title="Swap sides"><SwapIcon /></button>
        <SideFields label="Right side" side={draft.right} onChange={(right) => onDraftChange({ ...draft, right })} />
      </div>

      <div className="time-grid">
        <label className="field"><span>Start timestamp</span><div className="input-action"><input className="mono" value={draft.start} onChange={(event) => onDraftChange({ ...draft, start: event.target.value })} placeholder="12:34.500" /><button type="button" onClick={() => onUsePlayhead('start')}>Playhead</button></div></label>
        <label className="field"><span>End timestamp</span><div className="input-action"><input className="mono" value={draft.end} onChange={(event) => onDraftChange({ ...draft, end: event.target.value })} placeholder="18:20.250" /><button type="button" onClick={() => onUsePlayhead('end')}>Playhead</button></div></label>
      </div>

      <label className="check-field"><input type="checkbox" checked={keepSelections} onChange={(event) => onKeepSelectionsChange(event.target.checked)} /><span>Keep round, characters, and Fuses after adding</span></label>
      <div className="editor-actions">
        <button className="button button--primary" onClick={onSubmit}>{editing ? 'Update chapter' : 'Add chapter'}</button>
        <button className="button button--ghost" onClick={onCancel}>{editing ? 'Cancel edit' : 'Reset entry'}</button>
      </div>
      <p className="microcopy">Formats: 12:34 · 12:34.500 · 1:12:34. Use [ and ] to capture the video playhead.</p>
    </section>
  );
}
