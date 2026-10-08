import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getAuthCallbackUrl } from '../auth/authUtils';
import { SUPABASE_CONFIG_ERROR, supabase } from '../auth/supabase';
import { hasPasswordIdentity } from '../data/accountSettings';
import Button from './Button';
import Dialog from './Dialog';

type Action = 'email' | 'password' | 'done';

export default function AccountAccess() {
  const { user } = useAuth();
  const [action, setAction] = useState<Action | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const passwordAccount = user ? hasPasswordIdentity(user) : false;
  const pendingEmail = user?.new_email;

  function close() {
    if (pending) return;
    setAction(null); setEmail(''); setPassword(''); setConfirmation(''); setError('');
  }
  function open(next: Action) { setMessage(''); setError(''); setAction(next); }

  async function submit() {
    if (pending || !action || action === 'done') return;
    setError('');
    if (!supabase) { setError(SUPABASE_CONFIG_ERROR); return; }
    if (action === 'email' && email.trim().toLowerCase() === user?.email?.toLowerCase()) { setError('Enter a different email address.'); return; }
    if (action === 'password' && password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (action === 'password' && password !== confirmation) { setError('The passwords do not match.'); return; }
    setPending(true);
    try {
      const { error: updateError } = action === 'email'
        ? await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: getAuthCallbackUrl('/dashboard/settings') })
        : await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      setMessage(action === 'email'
        ? `Check ${email.trim()} (and your current inbox if required) to confirm the change. Until then you keep signing in with ${user?.email}.`
        : 'Your password has been changed.');
      setPassword(''); setConfirmation(''); setAction('done');
    } catch {
      setError('The change could not be saved. Try again.');
    } finally {
      setPending(false);
    }
  }

  const title = action === 'email' ? 'Change email' : action === 'password' ? 'Change password' : 'Change requested';
  return <>
    <div className="panel setting-section">
      <h2>Account access</h2>
      <div className="setting-row"><div><h3>Sign-in email</h3><p>{user?.email || 'No email available'}</p>
        {pendingEmail && <p role="status">Pending confirmation: {pendingEmail}. Your current email stays active until you confirm.</p>}</div>
        <Button className="secondary" onClick={() => open('email')}>Change email</Button></div>
      <div className="setting-row"><div><h3>Password</h3><p>{passwordAccount ? 'Choose a new password of at least 8 characters.' : 'Your sign-in provider manages your password.'}</p></div>
        {passwordAccount && <Button className="secondary" onClick={() => open('password')}>Change password</Button>}</div>
      <div className="setting-row"><div><h3>API keys</h3><p>Manage your API access.</p></div><Link className="text-link" to="/dashboard/api-keys">Manage API keys ↗</Link></div>
    </div>
    <div className="panel setting-section"><h2>Delete account</h2><p>To close your account, <Link className="text-link" to="/support">contact support</Link> from your sign-in email. Unused credits are forfeited when an account is deleted.</p></div>
    {action && <Dialog title={title} onClose={close}>
      {action !== 'done' && <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        {action === 'email' && <><p>We send a confirmation link before the new email becomes active.</p><div className="field"><label htmlFor="new-account-email">New email address</label><input id="new-account-email" type="email" autoComplete="email" required value={email} disabled={pending} onChange={event => setEmail(event.target.value)} /></div></>}
        {action === 'password' && <>
          <div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} disabled={pending} onChange={event => setPassword(event.target.value)} /></div>
          <div className="field"><label htmlFor="new-password-confirm">Confirm new password</label><input id="new-password-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={pending} onChange={event => setConfirmation(event.target.value)} /></div></>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-footer"><Button type="submit" disabled={pending}>{pending ? 'Saving…' : action === 'email' ? 'Send confirmation' : 'Change password'}</Button><Button className="secondary" disabled={pending} onClick={close}>Cancel</Button></div>
      </form>}
      {action === 'done' && <p role="status">{message}</p>}
    </Dialog>}
    {message && !action && <p role="status">{message}</p>}
  </>;
}
