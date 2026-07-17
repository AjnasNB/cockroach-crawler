import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const expectedIds = new Set(manifest.map((asset) => asset.id));
const failures = [];

function readPngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("not a valid PNG signature");
  }
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("PNG is missing its IHDR header");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

for (const asset of manifest) {
  const pngPath = join(root, "png", `${asset.id}.png`);
  const svgPath = join(root, "svg", `${asset.id}.svg`);

  try {
    const png = await readFile(pngPath);
    const dimensions = readPngDimensions(png);
    if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
      failures.push(`${asset.id}.png is ${dimensions.width}x${dimensions.height}; expected ${asset.width}x${asset.height}`);
    }
    if (png.length < 10_000) failures.push(`${asset.id}.png is unexpectedly small (${png.length} bytes)`);
  } catch (error) {
    failures.push(`${asset.id}.png: ${error.message}`);
  }

  try {
    const svg = await readFile(svgPath, "utf8");
    const width = svg.match(/<svg[^>]*\bwidth="(\d+)"/u)?.[1];
    const height = svg.match(/<svg[^>]*\bheight="(\d+)"/u)?.[1];
    if (Number(width) !== asset.width || Number(height) !== asset.height) {
      failures.push(`${asset.id}.svg declares ${width ?? "?"}x${height ?? "?"}; expected ${asset.width}x${asset.height}`);
    }
    if (!svg.includes("<title") || !svg.includes("<desc")) {
      failures.push(`${asset.id}.svg is missing an accessible title or description`);
    }
  } catch (error) {
    failures.push(`${asset.id}.svg: ${error.message}`);
  }
}

for (const format of ["png", "svg"]) {
  const files = (await readdir(join(root, format))).filter((name) => name.endsWith(`.${format}`));
  for (const file of files) {
    const id = file.slice(0, -(format.length + 1));
    if (!expectedIds.has(id)) failures.push(`unexpected ${format.toUpperCase()} file: ${file}`);
    const info = await stat(join(root, format, file));
    if (!info.isFile()) failures.push(`${file} is not a regular file`);
  }
  if (files.length !== manifest.length) {
    failures.push(`${format.toUpperCase()} directory contains ${files.length} assets; expected ${manifest.length}`);
  }
}

if (failures.length > 0) {
  console.error("Launch asset validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${manifest.length} SVG/PNG pairs with exact PNG dimensions.`);
}
