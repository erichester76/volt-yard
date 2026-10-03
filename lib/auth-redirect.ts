export function authRedirectUrl(origin: string, path: string) {
  const base = new URL(origin);
  const redirect = new URL(path, base);
  if (redirect.origin !== base.origin) throw new Error("Auth redirect path must remain on the application origin.");
  return redirect.toString();
}
