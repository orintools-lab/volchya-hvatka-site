import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db/client";

const legal = new Set(["privacy","offer","delivery","payment","returns","contacts"]);
export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ legal: string }> },
): Promise<Metadata> {
  const { legal: key } = await params;
  if (!legal.has(key)) return {};
  const block = await db.contentBlock.findUnique({ where: { key: `legal.${key}` } });
  const value = block?.value && typeof block.value === "object"
    ? block.value as { title?: string }
    : {};
  const title = value.title ?? "Информация";
  return {
    title,
    alternates: { canonical: `/${key}` },
    openGraph: {
      title,
      url: `/${key}`,
    },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ legal: string }> }) {
  const { legal: key } = await params;
  if (!legal.has(key)) notFound();
  const block = await db.contentBlock.findUnique({ where: { key: `legal.${key}` } });
  const value = block?.value && typeof block.value === "object" ? block.value as { title?: string; body?: string } : {};
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <Link href="/">← На главную</Link><h1>{value.title ?? "Документ готовится"}</h1>
    <div style={{maxWidth:760,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{value.body ?? "Владелец сайта должен заполнить и проверить этот текст перед публикацией."}</div>
  </main>;
}
