import { describe, expect, it } from "vitest";
import { canConsumeMagicLink } from "../src/server/services/magic-link-policy";
import {
  courseSlugsForPayment,
  hasActiveCourseAccess,
  ownsResource,
} from "../src/server/services/customer-access-policy";

describe("customer cabinet security and access", () => {
  it("оплаченный START выдаёт START, неоплаченный не выдаёт доступ", () => {
    expect(courseSlugsForPayment({ paymentSucceeded: true, itemSlugs: ["start"] })).toEqual(["start"]);
    expect(courseSlugsForPayment({ paymentSucceeded: false, itemSlugs: ["start"] })).toEqual([]);
  });

  it("оплаченный upsell выдаёт MASTER идемпотентно", () => {
    const courses = courseSlugsForPayment({ paymentSucceeded: true, itemSlugs: ["start"], upsellAccepted: true });
    expect(courses).toEqual(["start", "master"]);
    expect(new Set([...courses, ...courses]).size).toBe(2);
  });

  it("чужой пользователь не владеет заказом", () => {
    expect(ownsResource("customer-a", "customer-b")).toBe(false);
    expect(ownsResource("customer-a", "customer-a")).toBe(true);
  });

  it("курс нельзя открыть без активного CourseAccess", () => {
    expect(hasActiveCourseAccess(null, "customer-a")).toBe(false);
    expect(hasActiveCourseAccess({ customerId: "customer-a", revokedAt: new Date() }, "customer-a")).toBe(false);
    expect(hasActiveCourseAccess({ customerId: "customer-a", revokedAt: null }, "customer-a")).toBe(true);
  });

  it("magic-link одноразовый и истёкший отклоняется", () => {
    const now = new Date("2026-07-27T00:00:00Z");
    expect(canConsumeMagicLink({ usedAt: null, expiresAt: new Date("2026-07-27T00:01:00Z") }, now)).toBe(true);
    expect(canConsumeMagicLink({ usedAt: now, expiresAt: new Date("2026-07-27T00:01:00Z") }, now)).toBe(false);
    expect(canConsumeMagicLink({ usedAt: null, expiresAt: now }, now)).toBe(false);
  });
});
