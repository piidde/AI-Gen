export type NotificationPreferences = { lowBalance: boolean; threshold: string; productUpdates: boolean };
export type AlertState = { enabled: boolean; threshold: string; armed: boolean };
type AlertInput = { enabled: boolean; threshold: string; balance: string; verified: boolean };

export function validThreshold(value: string): boolean { return /^[1-9]\d*$/.test(value); }

export function hasPasswordIdentity(user: { identities?: { provider: string }[] }): boolean {
  return user.identities?.some(identity => identity.provider === 'email') ?? false;
}

// Pure preview policy, never an email scheduler. Threshold changes begin a new cycle;
// unverified email leaves the initial/crossing alert armed until verification.
export function advanceAlert(previous: AlertState | null, input: AlertInput): { state: AlertState; alert: boolean } {
  if (!validThreshold(input.threshold) || !/^\d+(\.\d+)?$/.test(input.balance)) throw new Error('Invalid credit amount');
  const [whole = '0', fraction = ''] = input.balance.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const balance = BigInt(whole) * scale + BigInt(fraction || '0');
  const threshold = BigInt(input.threshold) * scale;
  let armed = !previous?.enabled || previous.threshold !== input.threshold ? true : previous.armed;
  if (balance > threshold) armed = true;
  const alert = input.enabled && input.verified && armed && balance < threshold;
  return { state: { enabled: input.enabled, threshold: input.threshold, armed: alert ? false : armed }, alert };
}
