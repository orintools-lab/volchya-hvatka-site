import type { ReactNode } from "react";
import { SellerFooter } from "@/components/public/seller-footer";
import { getSellerDetails } from "@/server/services/seller-details";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const seller = await getSellerDetails();
  return <>{children}<SellerFooter details={seller} /></>;
}
