/**
 * build-texture-atlas.ts
 *
 * Composites 8 AmbientCG source texture packs + 1 solid black cell into a 3x3
 * grid (3072x3072). Generates 5 atlas JPGs: Color, NormalGL, Roughness,
 * Metalness, Opacity.
 *
 * Atlas cell layout (row-major, 0-indexed):
 *   0: structural_mass  (Metal032)      1: durasteel_span  (Metal038)     2: transit_deck   (Concrete007)
 *   3: collapsed_zone   (Concrete034)   4: dust_district   (Asphalt004)   5: bio_district   (Metal025)
 *   6: aerostructure    (Metal036)      7: abyssal_platform(Grate001)     8: void_pit        (solid black)
 *
 * Usage:  npx tsx scripts/build-texture-atlas.ts
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const CELL = 1024;
const GRID = 3;
const ATLAS = CELL * GRID; // 3072

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCES = path.join(ROOT, "public/assets/textures/sources");
const OUT_DIR = path.join(ROOT, "public/assets/textures");

/** Pack names in cell order (index 8 = void_pit, no pack). */
const PACKS = [
  "Metal032",    // 0 — structural_mass
  "Metal038",    // 1 — durasteel_span
  "Concrete007", // 2 — transit_deck
  "Concrete034", // 3 — collapsed_zone
  "Asphalt004",  // 4 — dust_district
  "Metal025",    // 5 — bio_district
  "Metal036",    // 6 — aerostructure
  "Grate001",    // 7 — abyssal_platform
  // 8 = void_pit — solid black, no source pack
] as const;

type MapType = "Color" | "NormalGL" | "Roughness" | "Metalness" | "Opacity";

const MAP_TYPES: MapType[] = [
  "Color",
  "NormalGL",
  "Roughness",
  "Metalness",
  "Opacity",
];

function cellPosition(index: number): { left: number; top: number } {
  const col = index % GRID;
  const row = Math.floor(index / GRID);
  return { left: col * CELL, top: row * CELL };
}

function sourcePath(pack: string, mapType: MapType): string {
  return path.join(SOURCES, pack, `${pack}_1K-JPG_${mapType}.jpg`);
}

async function buildAtlas(mapType: MapType): Promise<void> {
  // Opacity atlas: white background (fully opaque default).
  // All others: black background.
  const isOpacity = mapType === "Opacity";
  const bgColor = isOpacity
    ? { r: 255, g: 255, b: 255 }
    : { r: 0, g: 0, b: 0 };

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < PACKS.length; i++) {
    const pack = PACKS[i];
    const src = sourcePath(pack, mapType);

    if (!fs.existsSync(src)) {
      // Missing map — the background fill handles it:
      //   Metalness: black  (metalness=0 for non-metallic materials)
      //   Opacity:   white  (fully opaque)
      continue;
    }

    const { left, top } = cellPosition(i);
    composites.push({ input: src, left, top });
  }
  // Cell 8 (void_pit) is always background fill — nothing to composite.

  const outName = `floor_atlas_${mapType.toLowerCase().replace("normalgl", "normal")}.jpg`;
  const outPath = path.join(OUT_DIR, outName);

  await sharp({
    create: {
      width: ATLAS,
      height: ATLAS,
      channels: 3,
      background: bgColor,
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outPath);

  const stat = fs.statSync(outPath);
  const kb = (stat.size / 1024).toFixed(0);
  console.log(`  ${outName}  ${kb} KB`);
}

async function main() {
  console.log("Building texture atlases (3072x3072, 3x3 grid)...\n");

  for (const mapType of MAP_TYPES) {
    await buildAtlas(mapType);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
