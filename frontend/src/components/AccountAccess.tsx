import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useAccountDemo } from '../data/AccountDemoProvider';
import { useBillingDemo } from '../data/BillingDemoProvider';
import { hasPasswordIdentity } from '../data/accountSettings';
import { waitForDemo } from '../data/demoClient';
import Button from './Button';
import Dialog from './Dialog';

type Action = 'email' | 'password' | 'identity' | 'delete' | 'done';

export default function AccountAccess({ failSave = false }: { failSave?: boolean }) {
  const { user } = useAuth();
  const { pendingEmail, setPendingEmail } = useAccountDemo();
  const { data } = useBillingDemo();
  const balance = BigInt(data.balance).toLocaleString('en-US');
  const [action, setAction] = useState<Action | null>(null);
  const [scenario, setScenario] = useState<'success' | 'error' | 'loading'>('success');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    operation.current?.abort(); operation.current = null; setPending(false);
  }, [failSave]);
  const passwordAccount = user ? hasPasswordIdentity(user) : false;

  function close() {
    operation.current?.abort(); operation.current = null;
    setAction(null); setEmail(''); setPassword(''); setConfirmation(''); setConfirmed(false); setPending(false); setError('');
  }
  function open(next: Action) { close(); setMessage(''); setScenario('success'); setAction(next); }

  async function submit() {
    if (operation.current || !action || action === 'done') return;
    setError('');
    if (action === 'email' && email.trim().toLowerCase() === user?.email?.toLowerCase()) { setError('Enter a different email address.'); return; }
    if (action === 'password' && (password.length < 8 || password !== confirmation)) { setError('Use at least 8 sample characters and matching confirmation. Do not enter a real password.'); return; }
    if ((action === 'identity' || action === 'delete') && !confirmed) return;
    const controller = new AbortController(); operation.current = controller; setPending(true);
    try {
      await waitForDemo({ scenario, signal: controller.signal, delayMs: 500 });
      if (controller.signal.aborted) return;
      if (scenario === 'error' || failSave) throw new Error(action === 'identity' ? 'Simulated identity confirmation failed. Your account is unchanged. Try again or cancel.' : 'Simulated operation failed. Your edits are retained; no account change was made.');
      if (action === 'identity') { setConfirmed(false); setAction('delete'); }
      else {
        if (action === 'email') { setPendingEmail(email.trim()); setMessage('Mock email change pending verification. No email was sent; your sign-in email is unchanged.'); }
        if (action === 'password') setMessage('Mock password change complete. Your real password and sessions are unchanged.');
        if (action === 'delete') setMessage('Mock deletion complete. Your real account was not deleted; your credits, API access and session are unchanged.');
        setPassword(''); setConfirmation(''); setAction('done');
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Mock operation failed.');
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }

  const title = pending ? 'Mock operation pending…' : error ? 'Mock operation failed'
    : action === 'email' ? 'Change email — mock' : action === 'password' ? 'Change password — mock'
      : action === 'identity' ? 'Confirm identity — simulation' : action === 'delete' ? 'Confirm account deletion — mock' : 'Mock operation complete';
  return <>
    <div className="panel setting-section">
      <h2>Account access</h2>
      <p>MOCK account changes. These previews do not contact Supabase, send email or change credentials. Display-name editing remains live.</p>
      <div className="setting-row"><div><h3>Sign-in email</h3><p>{user?.email || 'No email available'}</p>
        {pendingEmail && <p role="status">Mock pending verification: {pendingEmail}. Current email remains {user?.email}.</p>}</div>
        <Button className="secondary" onClick={() => open('email')}>Change email</Button></div>
      <div className="setting-row"><div><h3>Password</h3><p>{passwordAccount ? 'Preview a password change using sample text only.' : 'Your credentials are managed by your sign-in provider. Change your password with that provider; this page does not link login methods.'}</p></div>
        {passwordAccount && <Button className="secondary" onClick={() => open('password')}>Change password</Button>}</div>
      <div className="setting-row"><div><h3>API access</h3><p>Manage keys separately from account sign-in.</p></div><Link className="text-link" to="/dashboard/api-keys">Manage API keys ↗</Link></div>
    </div>
    <div className="panel setting-section"><h2>Delete account</h2><p>Remaining demo balance: <strong>{balance} credits</strong>. Credits never expire while your account remains open. Deletion would forfeit remaining credits and terminate API access.</p>
      <p>Live deletion requires verified identity and resolution of pending operations and retention requirements. This simulation never deletes or signs out your real account.</p>
      <Button className="danger" onClick={() => open('identity')}>Preview account deletion</Button></div>
    {action && <Dialog title={title} onClose={close}>
      {action !== 'done' && <>
        <div className="field"><label htmlFor="account-operation-preview">Account operation preview</label><select id="account-operation-preview" value={scenario} disabled={pending} onChange={event => setScenario(event.target.value as typeof scenario)}>
          <option value="success">Success</option><option value="error">Operation error / identity failure</option><option value="loading">Keep pending</option>
        </select></div>
        <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          {action === 'email' && <><p>Verification would be required before the new email becomes active. This mock sends nothing.</p><div className="field"><label htmlFor="new-account-email">New email address</label><input id="new-account-email" type="email" required value={email} disabled={pending} onChange={event => setEmail(event.target.value)} /></div></>}
          {action === 'password' && <><p>Use made-up sample text only. No real password is checked, stored or changed.</p>
            <div className="field"><label htmlFor="sample-password">Sample new password</label><input id="sample-password" type="password" autoComplete="off" minLength={8} required value={password} disabled={pending} onChange={event => setPassword(event.target.value)} /></div>
            <div className="field"><label htmlFor="sample-password-confirm">Confirm sample password</label><input id="sample-password-confirm" type="password" autoComplete="off" minLength={8} required value={confirmation} disabled={pending} onChange={event => setConfirmation(event.target.value)} /></div></>}
          {action === 'identity' && <><p>You have <strong>{balance} remaining demo credits</strong>. Credits never expire; deletion would forfeit them and terminate API access.</p><p>Real deletion would require fresh authentication. Do not enter a password: this checkbox only simulates successful identity confirmation.</p>
            <label className="setting-row"><span>Simulate confirmed identity</span><input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} /></label></>}
          {action === 'delete' && <><p>Identity confirmation simulated. Deletion would forfeit all <strong>{balance} remaining demo credits</strong> and terminate API access. Credits otherwise never expire.</p>
            <label className="setting-row"><span>I understand credit forfeiture and API-access termination</span><input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} /></label></>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="form-footer"><Button type="submit" className={action === 'delete' ? 'danger' : ''} disabled={pending || ((action === 'identity' || action === 'delete') && !confirmed)}>
            {pending ? 'Pending…' : action === 'identity' ? 'Continue with simulated identity' : action === 'delete' ? 'Confirm mock deletion' : action === 'email' ? 'Request mock email change' : 'Save mock password'}
          </Button><Button className="secondary" onClick={close}>Cancel</Button></div>
        </form>
      </>}
      {action === 'done' && <p role="status">{message}</p>}
    </Dialog>}
  </>;
}
