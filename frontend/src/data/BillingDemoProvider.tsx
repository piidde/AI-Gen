import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { createBillingDemo, needsReconciliation, restorePendingOrder } from "./billingDemo";

type Client = ReturnType<typeof createBillingDemo>;
type Context = { client: Client; data: ReturnType<Client["read"]>; refresh: () => void; storageWarning: string };
const BillingContext = createContext<Context | null>(null);

function Session({ accountId, children }: { accountId: string; children: ReactNode }) {
  const key = `takewing-demo-pending-order-v1:${accountId}`;
  const [initial] = useState(() => {
    try { return { order: restorePendingOrder(sessionStorage.getItem(key)), warning: "" }; }
    catch { return { order: null, warning: "Tab storage unavailable. Pending demo orders cannot survive a reload; no payment status can be inferred." }; }
  });
  const [client] = useState(() => createBillingDemo(initial.order));
  const [data, setData] = useState(client.read);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  function refresh() {
    const next = client.read();
    setData(next);
    const order = next.orders.find(needsReconciliation);
    try {
      if (order) sessionStorage.setItem(key, JSON.stringify({ id: order.id, packageId: order.packageId, createdAt: order.createdAt }));
      else sessionStorage.removeItem(key);
      setStorageWarning("");
    } catch { setStorageWarning("Tab storage unavailable. Pending demo orders cannot survive a reload; no payment status can be inferred."); }
  }
  return <BillingContext.Provider value={{ client, data, refresh, storageWarning }}>{children}</BillingContext.Provider>;
}

export default function BillingDemoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Session key={user.id} accountId={user.id}>{children}</Session>;
}

export function useBillingDemo() {
  const context = useContext(BillingContext);
  if (!context) throw new Error("Billing demo requires an authenticated demo session");
  return context;
}
