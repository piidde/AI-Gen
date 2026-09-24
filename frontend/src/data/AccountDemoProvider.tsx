import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { NotificationPreferences } from './accountSettings';

type Context = {
  preferences: NotificationPreferences;
  savePreferences: (value: NotificationPreferences) => void;
  pendingEmail: string;
  setPendingEmail: (email: string) => void;
};
const AccountContext = createContext<Context | null>(null);

function Session({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({ lowBalance: false, threshold: '100000', productUpdates: false });
  const [pendingEmail, setPendingEmail] = useState('');
  return <AccountContext.Provider value={{ preferences, savePreferences: value => setPreferences({ ...value }), pendingEmail, setPendingEmail }}>{children}</AccountContext.Provider>;
}

export default function AccountDemoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Session key={user.id}>{children}</Session>;
}

export function useAccountDemo() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('Account demo requires an authenticated demo session');
  return context;
}
