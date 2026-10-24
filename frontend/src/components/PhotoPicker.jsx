import { useState } from 'react';
import { api, asApiError } from '../api/index.js';
import { Icon } from './Icons.jsx';
import { shrinkImage } from '../lib/image.js';

/** Choose a photo for a portfolio item. The photo is shrunk first, then uploaded. */
export function PhotoPicker({ value, onChange, label }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still triggers a change
    if (!file) return;
    setMessage('');
    setBusy(true);
    try {
      const small = await shrinkImage(file);
      const { url } = await api.uploadPhoto(small);
      onChange(url);
    } catch (err) {
      // shrinkImage throws plain Errors with a readable message; API failures are ApiErrors.
      setMessage(err instanceof Error && !err.code ? err.message : asApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-picker">
      {value ? (
        <img className="photo-preview" src={value} alt="" />
      ) : (
        <div className="photo-empty" aria-hidden="true">
          <Icon.Image width={28} height={28} />
        </div>
      )}
      <div className="photo-actions">
        <label className={`btn btn-secondary btn-small photo-button ${busy ? 'is-busy' : ''}`}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="visually-hidden" disabled={busy} aria-label={value ? `Change photo for ${label}` : `Add photo for ${label}`} />
          {busy && <span className="spinner" aria-hidden="true" />}
          <span>{busy ? 'Uploading…' : value ? 'Change photo' : 'Add a photo'}</span>
        </label>
        {value && !busy && (
          <button type="button" className="linkbtn" onClick={() => onChange(null)}>
            Remove photo
          </button>
        )}
      </div>
      {message && (
        <p className="error-text" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
