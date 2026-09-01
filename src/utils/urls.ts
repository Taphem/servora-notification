/**
 * servora-docs and servora-web do not yet define a frontend verification/
 * reset route (servora-web has no such pages implemented at the time of
 * writing). "/verify-email" and "/reset-password" below are this service's
 * own convention, not a documented Servora contract — update these two
 * functions if/when servora-web or servora-docs defines the real routes.
 */

export function buildEmailVerificationUrl(appPublicUrl: string, verificationToken: string): string {
  const url = new URL('/verify-email', appPublicUrl);
  url.searchParams.set('token', verificationToken);
  return url.toString();
}

export function buildPasswordResetUrl(appPublicUrl: string, resetToken: string): string {
  const url = new URL('/reset-password', appPublicUrl);
  url.searchParams.set('token', resetToken);
  return url.toString();
}
