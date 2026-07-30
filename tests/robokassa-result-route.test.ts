import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleRobokassaResult } from "../src/server/services/robokassa-result-handler";

const processResult = vi.fn();

describe("Robokassa ResultURL route", () => {
  beforeEach(() => processResult.mockReset());

  it("supports GET and returns OK{InvId}", async () => {
    processResult.mockResolvedValue("OK100");
    const response = await handleRobokassaResult(new Request(
      "https://example.test/api/payments/robokassa/result?OutSum=2700.00&InvId=100&SignatureValue=valid",
    ), processResult);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK100");
  });

  it("supports POST and rejects an incomplete callback", async () => {
    const response = await handleRobokassaResult(new Request(
      "https://example.test/api/payments/robokassa/result",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "OutSum=2700.00&InvId=100",
      },
    ), processResult);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("bad request");
  });
});
