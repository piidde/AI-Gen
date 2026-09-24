import { useSyncExternalStore } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const subscribe = () => () => {};
// React uses the server snapshot during hydration, then the browser snapshot.
export function useBrowserReady() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
export function usePublicSearchParams(): ReturnType<typeof useSearchParams> {
  const [params, setParams] = useSearchParams();
  return [useBrowserReady() ? params : new URLSearchParams(), setParams];
}
export function usePublicSearch() {
  const { search } = useLocation();
  return useBrowserReady() ? search : '';
}
