import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const source = process.argv[2];
const outputDir = path.resolve("public/brand");

if (!source) {
  throw new Error("Передайте путь к утверждённому мастер-листу логотипа.");
}

await mkdir(outputDir, { recursive: true });

const variants = [
  {
    name: "logo-horizontal.png",
    area: { left: 105, top: 80, width: 1025, height: 330 },
    width: 1200,
    padding: 28,
  },
  {
    name: "logo-vertical.png",
    area: { left: 85, top: 495, width: 260, height: 330 },
    width: 440,
    padding: 28,
  },
  {
    name: "symbol-gold.png",
    area: { left: 480, top: 520, width: 290, height: 280 },
    width: 512,
    padding: 20,
  },
  {
    name: "logo-white.png",
    area: { left: 45, top: 890, width: 275, height: 185 },
    width: 640,
    padding: 24,
  },
  {
    name: "logo-gold.png",
    area: { left: 655, top: 890, width: 260, height: 185 },
    width: 640,
    padding: 24,
  },
  {
    name: "favicon-source.png",
    area: { left: 285, top: 1110, width: 105, height: 105 },
    width: 512,
    padding: 22,
  },
];

async function removeBlackBackground(input) {
  const { data, info } = await input
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(info.width * info.height * 4);

  for (let sourceIndex = 0, outputIndex = 0; sourceIndex < data.length; sourceIndex += 3) {
    const red = data[sourceIndex];
    const green = data[sourceIndex + 1];
    const blue = data[sourceIndex + 2];
    const maximum = Math.max(red, green, blue);
    const alpha = maximum <= 8 ? 0 : Math.min(255, Math.round(((maximum - 8) / 247) * 255));
    const scale = maximum > 8 ? 255 / maximum : 0;

    output[outputIndex++] = Math.min(255, Math.round(red * scale));
    output[outputIndex++] = Math.min(255, Math.round(green * scale));
    output[outputIndex++] = Math.min(255, Math.round(blue * scale));
    output[outputIndex++] = alpha;
  }

  return sharp(output, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

for (const variant of variants) {
  const cropped = sharp(source).extract(variant.area);
  const transparent = await removeBlackBackground(cropped);

  await transparent
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .extend({
      top: variant.padding,
      right: variant.padding,
      bottom: variant.padding,
      left: variant.padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize({ width: variant.width, withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, variant.name));
}

const faviconSource = path.join(outputDir, "favicon-source.png");

for (const size of [16, 32, 180]) {
  const name = size === 180 ? "apple-touch-icon.png" : `favicon-${size}.png`;
  await sharp(faviconSource)
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, name));
}

console.log(`Готово: ${variants.length + 3} файлов в ${outputDir}`);
