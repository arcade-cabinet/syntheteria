import { expect, test } from "@playwright/experimental-ct-react";
import sharp from "sharp";
import { hexToWorld, worldToHex } from "../../src/ecs/terrain";
import { getTerrainHexGeometrySize } from "../../src/rendering/terrainHexLayout";
import { TerrainHexPreview } from "./TerrainHexPreview";

test("hex world coordinates snap cleanly for flat-top terrain", async () => {
	const { width, height } = getTerrainHexGeometrySize();
	const origin = hexToWorld(0, 0);
	const east = hexToWorld(1, 0);
	const southEast = hexToWorld(0, 1);

	expect(worldToHex(origin.x, origin.z)).toEqual({ q: 0, r: 0 });
	expect(worldToHex(east.x, east.z)).toEqual({ q: 1, r: 0 });
	expect(worldToHex(southEast.x, southEast.z)).toEqual({ q: 0, r: 1 });

	expect(east.x - origin.x).toBeCloseTo(width * 0.75, 5);
	expect(east.z - origin.z).toBeCloseTo(height / 2, 5);
	expect(southEast.x - origin.x).toBeCloseTo(0, 5);
	expect(southEast.z - origin.z).toBeCloseTo(height, 5);
});

test("hex preview renders transparent flat-top tiles without visible seams", async ({
	mount,
}, testInfo) => {
	const component = await mount(<TerrainHexPreview />);

	await expect(component).toBeVisible();
	await expect(component.locator("canvas")).toBeVisible();

	async function analyzeScreenshot() {
		const bounds = await component.boundingBox();
		expect(bounds).not.toBeNull();

		const fullScreenshot = await component.page().screenshot();
		const screenshot = await sharp(fullScreenshot)
			.extract({
				left: Math.floor(bounds!.x),
				top: Math.floor(bounds!.y),
				width: Math.max(1, Math.floor(bounds!.width)),
				height: Math.max(1, Math.floor(bounds!.height)),
			})
			.png()
			.toBuffer();

		const { data, info } = await sharp(screenshot)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		let nonBackdropPixels = 0;
		let backdropPixels = 0;

		for (let index = 0; index < data.length; index += info.channels) {
			const r = data[index];
			const g = data[index + 1];
			const b = data[index + 2];
			const a = data[index + 3];
			const isBackdrop = r === 255 && g === 0 && b === 255 && a === 255;

			if (isBackdrop) {
				backdropPixels++;
			} else if (a > 0) {
				nonBackdropPixels++;
			}
		}

		return { backdropPixels, nonBackdropPixels, screenshot, data, info };
	}

	await expect
		.poll(async () => (await analyzeScreenshot()).nonBackdropPixels, {
			timeout: 5_000,
		})
		.toBeGreaterThan(5_000);

	const { backdropPixels, nonBackdropPixels, screenshot, data, info } =
		await analyzeScreenshot();

	await testInfo.attach("terrain-hex-preview", {
		body: screenshot,
		contentType: "image/png",
	});

	function pixelAt(x: number, y: number) {
		const index = (Math.floor(y) * info.width + Math.floor(x)) * info.channels;
		return {
			r: data[index],
			g: data[index + 1],
			b: data[index + 2],
			a: data[index + 3],
		};
	}

	expect(pixelAt(5, 5)).toEqual({ r: 255, g: 0, b: 255, a: 255 });
	expect(backdropPixels).toBeGreaterThan(5_000);
	expect(nonBackdropPixels).toBeGreaterThan(5_000);
});
