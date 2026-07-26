export function courseSlugsForPayment(input: {
  paymentSucceeded: boolean;
  itemSlugs: string[];
  upsellAccepted?: boolean;
}) {
  if (!input.paymentSucceeded) return [];
  const courses = new Set<string>();
  if (input.itemSlugs.includes("start")) courses.add("start");
  if (input.upsellAccepted) courses.add("master");
  return [...courses];
}

export function ownsResource(customerId: string, resourceCustomerId: string | null) {
  return Boolean(resourceCustomerId && customerId === resourceCustomerId);
}

export function hasActiveCourseAccess(access: { customerId: string; revokedAt: Date | null } | null, customerId: string) {
  return Boolean(access && access.customerId === customerId && access.revokedAt === null);
}
