import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import type { ApiKey } from "./viewModels";

const initialKeys: ApiKey[] = [
  { id: "key-production", name: "Production", maskedIdentifier: "•••• •••• 8f2a", status: "active", createdAt: "2026-08-20T10:00:00Z", lastUsed: { status: "used", at: "2026-09-20T10:00:00Z" }, revokedAt: null },
  { id: "key-internal", name: "Internal", maskedIdentifier: "•••• •••• 4c7b", status: "active", createdAt: "2026-09-01T10:00:00Z", lastUsed: { status: "used", at: "2026-09-16T09:00:00Z" }, revokedAt: null },
  { id: "key-revoked", name: "Old integration (revoked)", maskedIdentifier: "•••• •••• 1d9e", status: "revoked", createdAt: "2026-07-01T10:00:00Z", lastUsed: { status: "used", at: "2026-09-15T09:00:00Z" }, revokedAt: "2026-09-16T10:00:00Z" },
];
type Context = { keys: ApiKey[]; addKey: (key: ApiKey) => void; revokeKey: (id: string) => void };
const KeyContext = createContext<Context | null>(null);

function Session({ children }: { children: ReactNode }) {
  // Only masked metadata lives across routes. Full samples belong to the creation dialog.
  const [keys, setKeys] = useState<ApiKey[]>(() => structuredClone(initialKeys));
  function addKey(key: ApiKey) { setKeys(current => [...current, key]); }
  function revokeKey(id: string) {
    const revokedAt = new Date().toISOString();
    setKeys(current => current.map(key => key.id === id ? { ...key, status: "revoked", revokedAt } : key));
  }
  return <KeyContext.Provider value={{ keys, addKey, revokeKey }}>{children}</KeyContext.Provider>;
}

export default function KeyDemoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Session key={user.id}>{children}</Session>;
}

export function useKeyDemo() {
  const context = useContext(KeyContext);
  if (!context) throw new Error("Key demo requires an authenticated demo session");
  return context;
}
