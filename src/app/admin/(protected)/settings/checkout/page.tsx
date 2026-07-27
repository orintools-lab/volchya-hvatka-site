import { redirect } from "next/navigation";

export default function LegacyCheckoutSettingsPage() {
  redirect("/admin/settings/payment");
}
