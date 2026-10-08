import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { apiFetch, errorMessage, microsToDecimal, useApiResource, usdToMicros, type PreferencesDto } from '../data/api';

type Draft = { lowBalance: boolean; threshold: string; productUpdates: boolean };

function fromDto(dto: PreferencesDto): Draft {
  return { lowBalance: dto.low_balance_enabled, threshold: dto.threshold_micros ? microsToDecimal(dto.threshold_micros) : '', productUpdates: dto.product_updates };
}

export default function NotificationSettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { user } = useAuth();
  const stored = useApiResource<PreferencesDto>('/v1/account/preferences');
  const [saved, setSaved] = useState<Draft>({ lowBalance: false, threshold: '', productUpdates: false });
  const [draft, setDraft] = useState<Draft>(saved);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const operation = useRef<AbortController | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const restoreSaveFocus = useRef(false);
  const dirty = draft.lowBalance !== saved.lowBalance || draft.threshold !== saved.threshold || draft.productUpdates !== saved.productUpdates;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    if (!stored.data) return;
    const next = fromDto(stored.data);
    setSaved(next); setDraft(next);
  }, [stored.data]);
  useLayoutEffect(() => {
    if (!pending && restoreSaveFocus.current) {
      restoreSaveFocus.current = false;
      saveButton.current?.focus();
    }
  }, [pending]);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChangeRef.current?.(false), []);

  const verified = Boolean(user?.email && user.email_confirmed_at);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.current || !dirty) return;
    const thresholdMicros = draft.threshold.trim() ? usdToMicros(draft.threshold) : null;
    if ((draft.lowBalance || draft.threshold.trim()) && thresholdMicros === null) {
      setMessage('Enter a positive USD amount, for example 5 or 2.50.');
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setPending(true);
    setMessage('');
    try {
      const result = await apiFetch<PreferencesDto>('/v1/account/preferences', { method: 'PUT', signal: controller.signal,
        body: { low_balance_enabled: draft.lowBalance, threshold_micros: thresholdMicros, product_updates: draft.productUpdates } });
      if (controller.signal.aborted) return;
      const next = fromDto(result);
      setSaved(next); setDraft(next);
      setMessage('Preferences saved.');
    } catch (cause) {
      if (!controller.signal.aborted) setMessage(`${errorMessage(cause, 'Preferences could not be saved.')} Your edits are retained.`);
    } finally {
      if (!controller.signal.aborted) {
        restoreSaveFocus.current = document.activeElement === cancelButton.current;
        operation.current = null;
        setPending(false);
      }
    }
  }

  return <>
    <form className="panel setting-section" onSubmit={save}>
      <h2>Notification preferences</h2>
      {stored.error && <p role="alert">{stored.error} <button type="button" className="button secondary" onClick={stored.reload}>Try again</button></p>}
      {stored.loading && !stored.data && <p role="status">Loading preferences…</p>}
      <p>Account email: {user?.email || 'Unavailable'} · <strong>{verified ? 'Verified' : 'Not verified, low-balance alerts are paused until you confirm your email'}</strong></p>
      <fieldset disabled={!stored.data}>
        <label className="setting-row"><span><strong>Low-balance email alerts</strong><span className="setting-description">One email when your balance falls below your threshold; another only after it rises above the threshold and falls again.</span></span>
          <input className="setting-toggle" type="checkbox" checked={draft.lowBalance} disabled={pending} onChange={event => { setDraft({ ...draft, lowBalance: event.target.checked }); setMessage(''); }} /></label>
        {draft.lowBalance && <div className="field"><label htmlFor="credit-alert-threshold">Alert threshold (USD)</label><input id="credit-alert-threshold" inputMode="decimal" required value={draft.threshold} disabled={pending} onChange={event => { setDraft({ ...draft, threshold: event.target.value }); setMessage(''); }} aria-describedby="threshold-hint" />
          <p id="threshold-hint">For example 5 or 2.50. Balances are checked every few minutes.</p></div>}
        <label className="setting-row"><span><strong>Product updates</strong><span className="setting-description">Occasional product news and improvements.</span></span><input className="setting-toggle" type="checkbox" checked={draft.productUpdates} disabled={pending} onChange={event => { setDraft({ ...draft, productUpdates: event.target.checked }); setMessage(''); }} /></label>
      </fieldset>
      <div className="form-footer"><button ref={saveButton} className="button" type="submit" disabled={pending || !dirty}>{pending ? 'Saving…' : 'Save preferences'}</button>{pending && <button ref={cancelButton} type="button" className="button secondary" onClick={() => {
        restoreSaveFocus.current = document.activeElement === cancelButton.current;
        operation.current?.abort(); operation.current = null; setPending(false); setMessage('Stopped waiting. Reload to check whether the save reached the server.');
      }}>Cancel save</button>}<span role="status">{message}</span></div>
    </form>
    <section className="notice"><h2>Essential account messages</h2><p>Security, account-access and payment messages remain separate from these optional preferences.</p></section>
  </>;
}
