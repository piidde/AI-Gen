export function hasPasswordIdentity(user: { identities?: { provider: string }[] }): boolean {
  return user.identities?.some(identity => identity.provider === 'email') ?? false;
}
