import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const sourceJsonPath = path.join(publicDir, 'products.json');
const generatedJsonPath = path.join(publicDir, 'products.generated.json');
const generatedPublicDir = '/generated/products';
const generatedDir = path.join(publicDir, 'generated', 'products');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
const videoExtensions = new Set(['.mp4', '.webm', '.mov', '.m4v']);

const variants = [
  { key: 'thumbUrl', suffix: 'thumb', width: 160, quality: 72 },
  { key: 'cardUrl', suffix: 'card', width: 900, quality: 78 },
  { key: 'detailUrl', suffix: 'detail', width: 1800, quality: 82 },
];

const toPublicPath = (filePath) => filePath.split(path.sep).join('/');

const isLocalProductAsset = (url) => typeof url === 'string' && url.startsWith('/products/');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isFresh(sourcePath, outputPath) {
  if (!(await fileExists(outputPath))) return false;

  const [sourceStat, outputStat] = await Promise.all([
    fs.stat(sourcePath),
    fs.stat(outputPath),
  ]);

  return outputStat.mtimeMs >= sourceStat.mtimeMs;
}

async function generateImageVariant(sourcePath, outputPath, variant) {
  if (await isFresh(sourcePath, outputPath)) return false;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(sourcePath)
    .rotate()
    .resize({
      width: variant.width,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({
      quality: variant.quality,
      effort: 5,
    })
    .toFile(outputPath);

  return true;
}

function generatedPathsFor(sourcePublicUrl) {
  const sourceRelativePath = sourcePublicUrl.replace(/^\/products\//, '');
  const parsed = path.parse(sourceRelativePath);

  return variants.map((variant) => {
    const outputRelativePath = path.join(parsed.dir, `${parsed.name}.${variant.suffix}.webp`);
    const outputPath = path.join(generatedDir, outputRelativePath);
    const publicUrl = `${generatedPublicDir}/${toPublicPath(outputRelativePath)}`;

    return { ...variant, outputPath, publicUrl };
  });
}

async function processMedia(media) {
  if (!media?.url || !isLocalProductAsset(media.url)) return media;

  const ext = path.extname(media.url).toLowerCase();
  const sourcePath = path.join(publicDir, media.url);

  if (!(await fileExists(sourcePath))) {
    console.warn(`media source not found: ${media.url}`);
    return media;
  }

  if (media.type === 'image' && imageExtensions.has(ext)) {
    const generated = generatedPathsFor(media.url);
    const generatedMedia = { ...media };

    for (const item of generated) {
      const didWrite = await generateImageVariant(sourcePath, item.outputPath, item);
      if (didWrite) {
        console.log(`generated ${path.relative(rootDir, item.outputPath)}`);
      }
      generatedMedia[item.key] = item.publicUrl;
    }

    return generatedMedia;
  }

  if (media.type === 'video' && videoExtensions.has(ext)) {
    return {
      ...media,
      cardUrl: media.cardUrl ?? media.url,
      detailUrl: media.detailUrl ?? media.url,
    };
  }

  return media;
}

async function main() {
  const raw = await fs.readFile(sourceJsonPath, 'utf8');
  const products = JSON.parse(raw);

  const generatedProducts = [];

  for (const product of products) {
    const media = [];
    for (const item of product.media ?? []) {
      media.push(await processMedia(item));
    }
    generatedProducts.push({ ...product, media });
  }

  await fs.mkdir(path.dirname(generatedJsonPath), { recursive: true });
  await fs.writeFile(generatedJsonPath, `${JSON.stringify(generatedProducts, null, 2)}\n`);
  console.log(`wrote ${path.relative(rootDir, generatedJsonPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
