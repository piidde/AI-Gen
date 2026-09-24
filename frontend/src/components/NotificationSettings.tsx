import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAccountDemo } from '../data/AccountDemoProvider';
import { validThreshold } from '../data/accountSettings';
import { waitForDemo } from '../data/demoClient';

export default function NotificationSettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { user } = useAuth();
  const { preferences, savePreferences } = useAccountDemo();
  const [draft, setDraft] = useState({ ...preferences });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const operation = useRef<AbortController | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const restoreSaveFocus = useRef(false);
  const dirty = draft.lowBalance !== preferences.lowBalance ||
    draft.threshold !== preferences.threshold ||
    draft.productUpdates !== preferences.productUpdates;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

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
    if (draft.lowBalance && !validThreshold(draft.threshold)) {
      setMessage('Enter a positive whole-number credit threshold.');
      return;
    }
    const submitted = {
      ...draft,
      threshold: validThreshold(draft.threshold) ? draft.threshold : preferences.threshold,
    };
    const controller = new AbortController();
    operation.current = controller;
    setPending(true);
    setMessage('');
    try {
      await waitForDemo({ scenario: 'success', signal: controller.signal, delayMs: 500 });
      if (controller.signal.aborted) return;
      savePreferences(submitted);
      setDraft(submitted);
      setMessage('Preferences saved for this session.');
    } catch (cause) {
      if (!controller.signal.aborted) setMessage(cause instanceof Error ? cause.message : 'Preferences could not be saved.');
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
      <p>Email notification delivery is not connected yet. Preferences are saved for this session only.</p>
      <p>Account email: {user?.email || 'Unavailable'} · <strong>{verified ? 'Verified' : 'Not verified — low-balance alerts are paused'}</strong></p>
      <label className="setting-row"><span><strong>Low-balance email alerts</strong><span className="setting-description">An alert when your balance falls below your threshold, then after it rises above the threshold and falls again.</span></span>
        <input className="setting-toggle" type="checkbox" checked={draft.lowBalance} disabled={pending} onChange={event => { setDraft({ ...draft, lowBalance: event.target.checked }); setMessage(''); }} /></label>
      {draft.lowBalance && <div className="field"><label htmlFor="credit-alert-threshold">Credit alert threshold</label><input id="credit-alert-threshold" inputMode="numeric" pattern="[1-9][0-9]*" required value={draft.threshold} disabled={pending} onChange={event => { setDraft({ ...draft, threshold: event.target.value }); setMessage(''); }} aria-describedby="threshold-hint" />
        <p id="threshold-hint">Enter a positive whole number of credits.</p></div>}
      <label className="setting-row"><span><strong>Product updates</strong><span className="setting-description">Occasional product news and improvements.</span></span><input className="setting-toggle" type="checkbox" checked={draft.productUpdates} disabled={pending} onChange={event => { setDraft({ ...draft, productUpdates: event.target.checked }); setMessage(''); }} /></label>
      <div className="form-footer"><button ref={saveButton} className="button" type="submit" disabled={pending || !dirty}>{pending ? 'Saving…' : 'Save preferences'}</button>{pending && <button ref={cancelButton} type="button" className="button secondary" onClick={() => {
        restoreSaveFocus.current = document.activeElement === cancelButton.current;
        operation.current?.abort(); operation.current = null; setPending(false); setMessage('Save cancelled. Your edits are retained.');
      }}>Cancel save</button>}<span role="status">{message}</span></div>
    </form>
    <section className="notice"><h2>Essential account messages</h2><p>Security, account-access and payment messages remain separate from these optional preferences.</p></section>
  </>;
}
