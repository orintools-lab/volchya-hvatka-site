import { createHash, timingSafeEqual } from "node:crypto";
import { assertRobokassaConfigured, env } from "../config/env";
import { getRobokassaCallbackUrls } from "../config/site-url";

function digest(value: string) {
  return createHash(env.ROBOKASSA_HASH_ALGORITHM).update(value, "utf8").digest("hex");
}

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left.toLowerCase());
  const b = Buffer.from(right.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export class RobokassaPaymentProvider {
  createPaymentUrl(input: {
    invoiceId: number;
    amount: string;
    description: string;
    email: string;
  }) {
    assertRobokassaConfigured();
    const callbackUrls = getRobokassaCallbackUrls();
    const successMethod = "GET";
    const failMethod = "GET";
    const signature = digest(
      [
        env.ROBOKASSA_MERCHANT_LOGIN,
        input.amount,
        input.invoiceId,
        callbackUrls.result,
        callbackUrls.success,
        successMethod,
        callbackUrls.fail,
        failMethod,
        env.ROBOKASSA_PASSWORD_1,
      ].join(":"),
    );
    const params = new URLSearchParams({
      MerchantLogin: env.ROBOKASSA_MERCHANT_LOGIN,
      OutSum: input.amount,
      InvId: String(input.invoiceId),
      Description: input.description.slice(0, 100),
      Email: input.email,
      Culture: "ru",
      Encoding: "utf-8",
      SignatureValue: signature,
      IsTest: env.ROBOKASSA_TEST_MODE === "true" ? "1" : "0",
      ResultUrl2: callbackUrls.result,
      SuccessUrl2: callbackUrls.success,
      SuccessUrl2Method: successMethod,
      FailUrl2: callbackUrls.fail,
      FailUrl2Method: failMethod,
    });
    return `https://auth.robokassa.ru/Merchant/Index.aspx?${params}`;
  }

  verifyResult(input: { amount: string; invoiceId: number; signature: string }) {
    assertRobokassaConfigured();
    const expected = digest(
      `${input.amount}:${input.invoiceId}:${env.ROBOKASSA_PASSWORD_2}`,
    );
    return secureEqual(expected, input.signature);
  }
}
