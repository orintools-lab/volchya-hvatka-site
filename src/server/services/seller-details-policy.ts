import { z } from "zod";

export const sellerDetailsSchema = z.object({
  sellerLegalName: z.string().trim().min(1, "Укажите полное наименование ИП."),
  sellerInn: z.string().trim().regex(/^\d{12}$/, "ИНН ИП должен содержать ровно 12 цифр."),
  sellerOgrnip: z.string().trim().regex(/^\d{15}$/, "ОГРНИП должен содержать ровно 15 цифр."),
  sellerAddress: z.string().trim().min(1, "Укажите адрес продавца."),
  sellerEmail: z.string().trim().email("Укажите корректный email."),
  sellerPhone: z.string().trim().min(5, "Укажите телефон продавца."),
});

export type SellerDetails = z.infer<typeof sellerDetailsSchema>;

export const SELLER_SETTING_KEYS = [
  "sellerLegalName",
  "sellerInn",
  "sellerOgrnip",
  "sellerAddress",
  "sellerEmail",
  "sellerPhone",
] as const;

export function sellerDetailLines(details: Partial<SellerDetails>) {
  return [
    details.sellerLegalName ? `Продавец: ${details.sellerLegalName}` : null,
    details.sellerInn ? `ИНН: ${details.sellerInn}` : null,
    details.sellerOgrnip ? `ОГРНИП: ${details.sellerOgrnip}` : null,
    details.sellerAddress ? `Адрес: ${details.sellerAddress}` : null,
  ].filter((line): line is string => Boolean(line));
}
