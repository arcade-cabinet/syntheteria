import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const inputDir = path.join(repoRoot, "assets", "tilesets");
const manifestPath = path.join(
	repoRoot,
	"src",
	"config",
	"generated",
	"terrainTilesetManifest.ts",
);

const TILE_WIDTH = 96;
const TILE_HEIGHT = 83;
const COLUMNS = 5;
const ROWS = 10;

interface ManifestTile {
	id: string;
	index: number;
	row: number;
	column: number;
}

interface ManifestTileset {
	id: string;
	label: string;
	importName: string;
	sourceImagePath: string;
	imagePixelSize: {
		width: number;
		height: number;
	};
	tilePixelSize: {
		width: number;
		height: number;
	};
	gridSize: {
		columns: number;
		rows: number;
	};
	tiles: ManifestTile[];
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function ensureRelativeImport(importPath: string) {
	return importPath.startsWith(".") ? importPath : `./${importPath}`;
}

async function main() {
	const sourceEntries = (await readdir(inputDir))
		.filter((entry) => entry.endsWith(".png"))
		.sort((a, b) => a.localeCompare(b));

	await mkdir(path.dirname(manifestPath), { recursive: true });

	const tilesets: ManifestTileset[] = [];
	const importStatements: string[] = [];

	for (const sourceEntry of sourceEntries) {
		const sourcePath = path.join(inputDir, sourceEntry);
		const label = path.basename(sourceEntry, ".png");
		const tilesetId = slugify(label);
		const importName = `${label.replace(/[^a-zA-Z0-9]+/g, "_")}_atlas`;
		const image = sharp(sourcePath);
		const metadata = await image.metadata();
		const relativeImportPath = ensureRelativeImport(
			path
				.relative(path.dirname(manifestPath), sourcePath)
				.replaceAll(path.sep, "/"),
		);

		if (metadata.width !== TILE_WIDTH * COLUMNS) {
			throw new Error(
				`Unexpected width for ${sourceEntry}: ${metadata.width}. Expected ${TILE_WIDTH * COLUMNS}.`,
			);
		}

		if (metadata.height !== TILE_HEIGHT * ROWS) {
			throw new Error(
				`Unexpected height for ${sourceEntry}: ${metadata.height}. Expected ${TILE_HEIGHT * ROWS}.`,
			);
		}
		importStatements.push(`import ${importName} from "${relativeImportPath}";`);

		const tiles: ManifestTile[] = [];
		let index = 0;

		for (let row = 0; row < ROWS; row++) {
			for (let column = 0; column < COLUMNS; column++) {
				tiles.push({
					id: `${tilesetId}:${row}:${column}`,
					index,
					row,
					column,
				});
				index++;
			}
		}

		tilesets.push({
			id: tilesetId,
			label,
			importName,
			sourceImagePath: path
				.relative(repoRoot, sourcePath)
				.replaceAll(path.sep, "/"),
			imagePixelSize: {
				width: metadata.width,
				height: metadata.height,
			},
			tilePixelSize: {
				width: TILE_WIDTH,
				height: TILE_HEIGHT,
			},
			gridSize: {
				columns: COLUMNS,
				rows: ROWS,
			},
			tiles,
		});
	}

	const manifestLiteral = JSON.stringify(
		{
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			tilesets,
		},
		null,
		2,
	).replace(/"importName": "([a-zA-Z0-9_]+)"/g, '"imageAsset": $1');

	const fileContents = `${importStatements.join("\n")}

export interface TerrainTilesetManifestTile {
  id: string;
  index: number;
  row: number;
  column: number;
}

export interface TerrainTilesetManifestTileset {
  id: string;
  label: string;
  sourceImagePath: string;
  imageAsset: string | number;
  imagePixelSize: {
    width: number;
    height: number;
  };
  tilePixelSize: {
    width: number;
    height: number;
  };
  gridSize: {
    columns: number;
    rows: number;
  };
  tiles: TerrainTilesetManifestTile[];
}

export interface TerrainTilesetManifest {
  schemaVersion: number;
  generatedAt: string;
  tilesets: TerrainTilesetManifestTileset[];
}

export const terrainTilesetManifest: TerrainTilesetManifest = ${manifestLiteral};
`;

	await writeFile(manifestPath, fileContents, "utf8");
	console.log(
		`Generated ${tilesets.length} tilesets and ${tilesets.reduce((sum, tileset) => sum + tileset.tiles.length, 0)} tiles.`,
	);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
