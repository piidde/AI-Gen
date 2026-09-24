export function queryChoice<T extends string>(params: URLSearchParams, key: string, choices: readonly T[], fallback: T): T {
  const value = params.get(key);
  return choices.find(choice => choice === value) ?? fallback;
}

export function updateQuery(params: URLSearchParams, key: string, value: string, defaultValue = ""): URLSearchParams {
  const next = new URLSearchParams(params);
  if (value === defaultValue) next.delete(key);
  else next.set(key, value);
  return next;
}
