#!/usr/bin/env npx tsx
/**
 * Ingest undermaterial textures from 2DPhotorealistic for pit interiors.
 *
 * Usage (when assets are available):
 *   UNDERMATERIALS_SRC=/Volumes/home/assets/2DPhotorealistic pnpm tsx scripts/ingest-undermaterials.ts
 *
 * Expected structure:
 *   Textures/polyhaven/ — sand, gravel, soil
 *   TERRAIN/ — bedrock, subsoil
 *
 * Output: Updates game_config.undermaterials in SQLite (or writes JSON for manual merge).
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC =
	process.env.UNDERMATERIALS_SRC ?? "/Volumes/home/assets/2DPhotorealistic";

interface UndermaterialDef {
	id: string;
	texturePath: string;
}

function discoverTextures(dir: string, prefix: string): UndermaterialDef[] {
	const results: UndermaterialDef[] = [];
	if (!existsSync(dir)) return results;

	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const e of entries) {
			const fullPath = join(dir, e.name);
			const relPath = `${prefix}/${e.name}`;
			if (e.isDirectory()) {
				results.push(...discoverTextures(fullPath, relPath));
			} else if (/\.(jpg|jpeg|png|webp)$/i.test(e.name)) {
				const id = e.name
					.replace(/\.[^.]+$/, "")
					.replace(/\s+/g, "_")
					.toLowerCase();
				results.push({
					id: `${prefix.replace(/\//g, "_")}_${id}`,
					texturePath: relPath,
				});
			}
		}
	} catch {
		// ignore
	}
	return results;
}

function main() {
	const materials: UndermaterialDef[] = [];

	const polyhaven = join(SRC, "Textures", "polyhaven");
	if (existsSync(polyhaven)) {
		materials.push(...discoverTextures(polyhaven, "Textures/polyhaven"));
	}

	const terrain = join(SRC, "TERRAIN");
	if (existsSync(terrain)) {
		materials.push(...discoverTextures(terrain, "TERRAIN"));
	}

	if (materials.length === 0) {
		console.warn(
			`No undermaterials found at ${SRC}. Set UNDERMATERIALS_SRC if assets are elsewhere.`,
		);
		process.exit(0);
	}

	console.log(JSON.stringify(materials, null, 2));
}

main();
