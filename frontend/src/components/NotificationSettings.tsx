import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAccountDemo } from '../data/AccountDemoProvider';
import { useBillingDemo } from '../data/BillingDemoProvider';
import { advanceAlert, validThreshold } from '../data/accountSettings';
import { waitForDemo } from '../data/demoClient';

export default function NotificationSettings({ failSave = false }: { failSave?: boolean }) {
  const { user } = useAuth();
  const { preferences, savePreferences } = useAccountDemo();
  const { data } = useBillingDemo();
  const [draft, setDraft] = useState({ ...preferences });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [scenario, setScenario] = useState<'success' | 'loading'>('success');
  const operation = useRef<AbortController | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const restoreSaveFocus = useRef(false);
  useLayoutEffect(() => {
    if (!pending && restoreSaveFocus.current) {
      restoreSaveFocus.current = false;
      saveButton.current?.focus();
    }
  }, [pending]);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    restoreSaveFocus.current = document.activeElement === cancelButton.current;
    operation.current?.abort(); operation.current = null; setPending(false);
  }, [failSave]);
  const verified = Boolean(user?.email && user.email_confirmed_at);
  const initialAlert = validThreshold(draft.threshold) && advanceAlert(null, { enabled: draft.lowBalance, threshold: draft.threshold, balance: data.balance, verified }).alert;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.current) return;
    if (!validThreshold(draft.threshold)) { setMessage('Enter a positive whole-number credit threshold.'); return; }
    const submitted = { ...draft };
    const controller = new AbortController(); operation.current = controller; setPending(true); setMessage('');
    try {
      await waitForDemo({ scenario, signal: controller.signal, delayMs: 500 });
      if (controller.signal.aborted) return;
      if (failSave) { setMessage('Simulated save failure. Your edits are retained.'); return; }
      savePreferences(submitted);
      setMessage('Mock preferences saved for this demo account until reload or sign-out. No email was sent or scheduled.');
    } catch (cause) {
      if (!controller.signal.aborted) setMessage(cause instanceof Error ? cause.message : 'Mock preferences could not be saved.');
    } finally {
      if (!controller.signal.aborted) {
        restoreSaveFocus.current = document.activeElement === cancelButton.current;
        operation.current = null; setPending(false);
      }
    }
  }
  return <>
    <form className="panel setting-section" onSubmit={save}>
      <h2>Notification preferences</h2>
      <p>MOCK preferences, kept only for this signed-in account in memory. This browser never schedules or sends notifications.</p>
      <p>Current demo balance: <strong>{BigInt(data.balance).toLocaleString('en-US')} credits</strong>.</p>
      <p>Account email: {user?.email || 'Unavailable'} · <strong>{verified ? 'Verified' : 'Not verified — low-balance alerts are paused'}</strong></p>
      <label className="setting-row"><span><strong>Low-balance email alerts</strong><span className="setting-description">An initial alert when enabled below your threshold, then once per downward crossing. Alerts rearm only after the balance rises above the threshold.</span></span>
        <input type="checkbox" checked={draft.lowBalance} disabled={pending} onChange={event => { setDraft({ ...draft, lowBalance: event.target.checked }); setMessage(''); }} /></label>
      <div className="field"><label htmlFor="credit-alert-threshold">Credit alert threshold</label><input id="credit-alert-threshold" inputMode="numeric" pattern="[1-9][0-9]*" required value={draft.threshold} disabled={pending} onChange={event => { setDraft({ ...draft, threshold: event.target.value }); setMessage(''); }} aria-describedby="threshold-hint" />
        <p id="threshold-hint">Use a positive whole number of credits. {initialAlert ? 'Your current balance is below this threshold: enabling would qualify for one initial alert.' : 'Alerts require a verified email and a balance below the threshold.'}</p></div>
      <label className="setting-row"><span><strong>Product updates</strong><span className="setting-description">Optional feature and improvement news. Off by default.</span></span><input type="checkbox" checked={draft.productUpdates} disabled={pending} onChange={event => { setDraft({ ...draft, productUpdates: event.target.checked }); setMessage(''); }} /></label>
      <div className="field"><label htmlFor="preference-save-preview">Preference save preview</label><select id="preference-save-preview" disabled={pending} value={scenario} onChange={event => setScenario(event.target.value as typeof scenario)}><option value="success">Complete</option><option value="loading">Keep pending</option></select></div>
      <div className="form-footer"><button ref={saveButton} className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save preferences'}</button>{pending && <button ref={cancelButton} type="button" className="button secondary" onClick={() => {
        restoreSaveFocus.current = document.activeElement === cancelButton.current;
        operation.current?.abort(); operation.current = null; setPending(false); setMessage('Mock save cancelled. Your edits are retained.');
      }}>Cancel save</button>}<span role="status">{message}</span></div>
    </form>
    <section className="notice"><h2>Essential account messages</h2><p>Security, account-access and payment messages are separate from optional product updates and low-balance alerts. These preferences do not turn essential notices off.</p></section>
    <p className="review-note">Preview assumptions: changing the threshold starts a new alert evaluation; saving unchanged preferences does not. Unverified email pauses alerts without consuming the initial alert. Delivery after verification, duplicate protection and rearming require backend agreement and tests before live use.</p>
  </>;
}
