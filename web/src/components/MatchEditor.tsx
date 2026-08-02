import type { GameFieldValue, MatchDraft, MatchSide } from '../types';
import type { GameProfile, ProfileFieldDefinition } from '../games/types';
import { SwapIcon } from './Icons';

interface MatchEditorProps {
  profile: GameProfile;
  draft: MatchDraft;
  editing: boolean;
  keepSelections: boolean;
  onDraftChange: (draft: MatchDraft) => void;
  onKeepSelectionsChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onUsePlayhead: (field: 'start' | 'end') => void;
}

function ProfileField({
  sideKey,
  definition,
  value,
  onChange
}: {
  sideKey: string;
  definition: ProfileFieldDefinition;
  value: GameFieldValue | undefined;
  onChange: (value: GameFieldValue) => void;
}) {
  const className = `field profile-field profile-field--${definition.span ?? 'full'}`;
  if (definition.kind === 'boolean') {
    return (
      <label className={`${className} profile-field--boolean`}>
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />
        <span>{definition.trueLabel ?? definition.label}</span>
      </label>
    );
  }

  const stringValue = typeof value === 'string' ? value : '';
  if (definition.kind === 'select' && definition.allowCustomValue) {
    const listId = `${sideKey}-${definition.id}-options`;
    return (
      <label className={className}>
        <span>{definition.label}</span>
        <input
          list={listId}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={definition.placeholder}
        />
        <datalist id={listId}>
          {definition.options?.map((option) => <option key={option} value={option} />)}
        </datalist>
      </label>
    );
  }

  if (definition.kind === 'select') {
    return (
      <label className={className}>
        <span>{definition.label}</span>
        <select value={stringValue} onChange={(event) => onChange(event.target.value)}>
          {definition.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return (
    <label className={className}>
      <span>{definition.label}</span>
      <input value={stringValue} onChange={(event) => onChange(event.target.value)} placeholder={definition.placeholder} />
    </label>
  );
}

function SideFields({
  profile,
  sideKey,
  label,
  side,
  onChange
}: {
  profile: GameProfile;
  sideKey: 'left' | 'right';
  label: string;
  side: MatchSide;
  onChange: (side: MatchSide) => void;
}) {
  const setField = (id: string, value: GameFieldValue) => {
    onChange({ ...side, fields: { ...side.fields, [id]: value } });
  };

  return (
    <fieldset className="side-fields">
      <legend>{label}</legend>
      <label className="field profile-field profile-field--full">
        <span>Player</span>
        <input
          value={side.name}
          onChange={(event) => onChange({ ...side, name: event.target.value })}
          placeholder={sideKey === 'left' ? 'Player 1' : 'Player 2'}
        />
      </label>
      <div className="profile-fields-grid">
        {profile.sideFields.map((field) => (
          <ProfileField
            key={field.id}
            sideKey={sideKey}
            definition={field}
            value={side.fields[field.id]}
            onChange={(value) => setField(field.id, value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function MatchEditor({
  profile,
  draft,
  editing,
  keepSelections,
  onDraftChange,
  onKeepSelectionsChange,
  onSubmit,
  onCancel,
  onUsePlayhead
}: MatchEditorProps) {
  const swapSides = () => onDraftChange({
    ...draft,
    left: { ...draft.right, fields: { ...draft.right.fields } },
    right: { ...draft.left, fields: { ...draft.left.fields } }
  });
  const roundListId = `round-options-${profile.id}`;

  return (
    <section className="panel editor-panel">
      <div className="panel__heading panel__heading--row">
        <span>{editing ? 'Edit chapter' : `${profile.shortName} chapter editor`}</span>
        <kbd>Ctrl ↵</kbd>
      </div>

      {profile.editorKind === 'generic' ? (
        <label className="field">
          <span>Chapter title</span>
          <input
            value={draft.nameOverride}
            onChange={(event) => onDraftChange({ ...draft, nameOverride: event.target.value })}
            placeholder="Introduction, Interview, Credits…"
          />
        </label>
      ) : (
        <>
          <label className="field">
            <span>Round / bracket label</span>
            <input
              list={roundListId}
              value={draft.round}
              onChange={(event) => onDraftChange({ ...draft, round: event.target.value })}
              placeholder="Pools, Top 8, Grand Final…"
            />
            <datalist id={roundListId}>{profile.rounds.map((round) => <option key={round} value={round} />)}</datalist>
          </label>
          <label className="field">
            <span>Custom chapter title <em>optional</em></span>
            <input
              value={draft.nameOverride}
              onChange={(event) => onDraftChange({ ...draft, nameOverride: event.target.value })}
              placeholder="Leave blank to generate from the match selections"
            />
          </label>
          <div className="sides-grid">
            <SideFields profile={profile} sideKey="left" label="Left side" side={draft.left} onChange={(left) => onDraftChange({ ...draft, left })} />
            <button className="swap-button" type="button" onClick={swapSides} title="Swap sides"><SwapIcon /></button>
            <SideFields profile={profile} sideKey="right" label="Right side" side={draft.right} onChange={(right) => onDraftChange({ ...draft, right })} />
          </div>
        </>
      )}

      <div className="time-grid">
        <label className="field">
          <span>Start timestamp</span>
          <div className="input-action">
            <input className="mono" value={draft.start} onChange={(event) => onDraftChange({ ...draft, start: event.target.value })} placeholder="12:34.500" />
            <button type="button" onClick={() => onUsePlayhead('start')}>Playhead</button>
          </div>
        </label>
        <label className="field">
          <span>End timestamp</span>
          <div className="input-action">
            <input className="mono" value={draft.end} onChange={(event) => onDraftChange({ ...draft, end: event.target.value })} placeholder="18:20.250" />
            <button type="button" onClick={() => onUsePlayhead('end')}>Playhead</button>
          </div>
        </label>
      </div>

      <label className="field">
        <span>Output filename <em>optional</em></span>
        <input
          value={draft.outputNameOverride}
          onChange={(event) => onDraftChange({ ...draft, outputNameOverride: event.target.value })}
          placeholder="Leave blank for automatic naming"
        />
      </label>

      {profile.editorKind === 'versus' ? (
        <label className="check-field">
          <input type="checkbox" checked={keepSelections} onChange={(event) => onKeepSelectionsChange(event.target.checked)} />
          <span>Keep round and game selections after adding</span>
        </label>
      ) : null}

      <div className="editor-actions">
        <button className="button button--primary" onClick={onSubmit}>{editing ? 'Update chapter' : 'Add chapter'}</button>
        <button className="button button--ghost" onClick={onCancel}>{editing ? 'Cancel edit' : 'Reset entry'}</button>
      </div>
      <p className="microcopy">Formats: 12:34 · 12:34.500 · 1:12:34. Use [ and ] to capture the video playhead.</p>
    </section>
  );
}
