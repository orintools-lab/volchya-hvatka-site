import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SellerFooter } from "../src/components/public/seller-footer";
import {
  sellerDetailLines,
  sellerDetailsSchema,
} from "../src/server/services/seller-details-policy";

const validSeller = {
  sellerLegalName: "Индивидуальный предприниматель Иванов Иван Иванович",
  sellerInn: "123456789012",
  sellerOgrnip: "123456789012345",
  sellerAddress: "г. Самара, ул. Примерная, д. 1",
  sellerEmail: "seller@example.com",
  sellerPhone: "+7 900 000-00-00",
};

describe("seller details", () => {
  it("accepts complete seller details that an administrator can save", () => {
    expect(sellerDetailsSchema.parse(validSeller)).toEqual(validSeller);
  });

  it("rejects an invalid individual entrepreneur INN", () => {
    expect(sellerDetailsSchema.safeParse({ ...validSeller, sellerInn: "1234567890" }).success).toBe(false);
    expect(sellerDetailsSchema.safeParse({ ...validSeller, sellerInn: "12345678901A" }).success).toBe(false);
  });

  it("rejects an invalid OGRNIP", () => {
    expect(sellerDetailsSchema.safeParse({ ...validSeller, sellerOgrnip: "12345678901234" }).success).toBe(false);
    expect(sellerDetailsSchema.safeParse({ ...validSeller, sellerOgrnip: "12345678901234A" }).success).toBe(false);
  });

  it("formats only populated footer lines", () => {
    expect(sellerDetailLines({
      sellerLegalName: validSeller.sellerLegalName,
      sellerInn: validSeller.sellerInn,
    })).toEqual([
      `Продавец: ${validSeller.sellerLegalName}`,
      `ИНН: ${validSeller.sellerInn}`,
    ]);
  });

  it("does not render empty seller values", () => {
    expect(sellerDetailLines({})).toEqual([]);
    expect(sellerDetailLines({ sellerInn: "" })).toEqual([]);
  });

  it("renders populated details in server-generated footer HTML", () => {
    const html = renderToStaticMarkup(React.createElement(SellerFooter, { details: validSeller }));
    expect(html).toContain(validSeller.sellerLegalName);
    expect(html).toContain(validSeller.sellerInn);
    expect(html).toContain(validSeller.sellerOgrnip);
    expect(html).toContain(validSeller.sellerAddress);
    expect(html).toContain('href="/seller-details"');
  });

  it("keeps legal links in server-generated footer HTML", () => {
    const html = renderToStaticMarkup(React.createElement(SellerFooter, { details: {} }));
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/offer"');
    expect(html).toContain('href="/delivery"');
    expect(html).toContain('href="/returns"');
    expect(html).not.toContain("ИНН:");
  });
});
