import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Check = {
  label: string;
  count: number;
  minimum: number;
};

async function main() {
  await prisma.$queryRaw`SELECT 1`;

  const [
    administrators,
    primaryProducts,
    faqItems,
    reviews,
    homepageContent,
  ] = await Promise.all([
    prisma.adminUser.count({ where: { isActive: true } }),
    prisma.product.count({
      where: {
        isActive: true,
        slug: { in: ["start", "master"] },
      },
    }),
    prisma.faqItem.count({ where: { isVisible: true } }),
    prisma.review.count({ where: { isVisible: true } }),
    prisma.contentBlock.count({
      where: {
        isVisible: true,
        key: { in: ["hero.title", "hero.subtitle", "video.main"] },
      },
    }),
  ]);

  const checks: Check[] = [
    { label: "Database connection", count: 1, minimum: 1 },
    { label: "Active administrators", count: administrators, minimum: 1 },
    { label: "Primary products", count: primaryProducts, minimum: 2 },
    { label: "Visible FAQ items", count: faqItems, minimum: 1 },
    { label: "Visible reviews", count: reviews, minimum: 1 },
    { label: "Homepage content blocks", count: homepageContent, minimum: 3 },
  ];

  let failed = false;
  for (const check of checks) {
    const passed = check.count >= check.minimum;
    failed ||= !passed;
    console.log(
      `${passed ? "PASS" : "FAIL"}: ${check.label}; count=${check.count}; required>=${check.minimum}`,
    );
  }

  if (failed) {
    throw new Error("Database verification failed.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Database verification failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
