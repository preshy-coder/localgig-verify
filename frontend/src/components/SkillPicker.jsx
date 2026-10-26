import { useEffect, useState } from 'react';
import { api } from '../api/index.js';
import { Icon } from './Icons.jsx';
import { Button } from './Button.jsx';
import { LIMITS } from '../lib/validate.js';

/**
 * Lets someone type a skill and add it, tap a suggestion, or remove one.
 * Skills are plain text, so a freelancer is never stuck because a skill isn't on the list.
 */
export function SkillPicker({ skills, onChange, error }) {
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Suggestions: popular skills when the box is empty, matches while typing. A failure here is
  // not worth a banner; typing a skill by hand still works.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .listSkills({ q: text.trim(), limit: 8 })
        .then((res) => !cancelled && setSuggestions(res.items.map((s) => s.name)))
        .catch(() => !cancelled && setSuggestions([]));
    }, text ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  function add(raw) {
    const skill = raw.trim().replace(/\s+/g, ' ');
    if (!skill) return;
    if (skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setLocalError(`${skill} is already on your list.`);
      return;
    }
    if (skill.length > LIMITS.skill) {
      setLocalError(`Keep each skill to ${LIMITS.skill} characters or fewer.`);
      return;
    }
    if (skills.length >= LIMITS.skills) {
      setLocalError(`You can add up to ${LIMITS.skills} skills. Remove one to add another.`);
      return;
    }
    setLocalError('');
    onChange([...skills, skill]);
    setText('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(text);
    }
  }

  const unused = suggestions.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()));
  const shownError = localError || error;

  return (
    <div className="field">
      <label htmlFor="skill-input" className="label">
        Skills
      </label>

      {skills.length > 0 ? (
        <ul className="chips chips-edit" aria-label="Your skills">
          {skills.map((s) => (
            <li key={s} className="chip chip-selected">
              <span>{s}</span>
              <button type="button" className="chip-remove" onClick={() => onChange(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                <Icon.Close width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No skills yet. Clients search by skill, so add at least one.</p>
      )}

      <div className="inline-add">
        <input
          id="skill-input"
          className="input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLocalError('');
          }}
          onKeyDown={onKeyDown}
          placeholder="For example: Photography"
          maxLength={LIMITS.skill + 10}
          aria-invalid={shownError ? 'true' : undefined}
          aria-describedby={shownError ? 'skill-err' : undefined}
          enterKeyHint="done"
        />
        <Button variant="secondary" onClick={() => add(text)} disabled={!text.trim()}>
          Add skill
        </Button>
      </div>
      {shownError && (
        <p className="error-text" id="skill-err">
          {shownError}
        </p>
      )}

      {unused.length > 0 && (
        <div className="suggest">
          <p className="hint">{text.trim() ? 'Suggestions' : 'Popular skills'}</p>
          <div className="chips">
            {unused.map((s) => (
              <button type="button" key={s} className="chip chip-button" onClick={() => add(s)}>
                <Icon.Plus width={14} height={14} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
