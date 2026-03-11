import materialsConfig from "../materials.json";

describe("materials.json", () => {
	const baseMaterials = ["rock", "scrap_iron", "iron", "copper", "silicon", "titanium"];

	it("has all base ore/material types", () => {
		for (const mat of baseMaterials) {
			expect(materialsConfig[mat as keyof typeof materialsConfig]).toBeDefined();
		}
	});

	it("each base material has PBR properties", () => {
		for (const mat of baseMaterials) {
			const m = materialsConfig[mat as keyof typeof materialsConfig] as Record<string, unknown>;
			expect(typeof m.metalness).toBe("number");
			expect(typeof m.roughness).toBe("number");
			expect(typeof m.color).toBe("string");
			expect(m.metalness as number).toBeGreaterThanOrEqual(0);
			expect(m.metalness as number).toBeLessThanOrEqual(1);
			expect(m.roughness as number).toBeGreaterThanOrEqual(0);
			expect(m.roughness as number).toBeLessThanOrEqual(1);
		}
	});

	it("metalness increases from rock to titanium", () => {
		expect(materialsConfig.rock.metalness).toBeLessThan(materialsConfig.titanium.metalness);
	});

	describe("machineAssembly", () => {
		it("has material quality values", () => {
			const quality = materialsConfig.machineAssembly.materialQuality;
			expect(Object.keys(quality).length).toBeGreaterThanOrEqual(3);
			for (const q of Object.values(quality)) {
				expect(q).toBeGreaterThan(0);
			}
		});

		it("titanium has highest quality", () => {
			expect(materialsConfig.machineAssembly.materialQuality.titanium).toBeGreaterThan(
				materialsConfig.machineAssembly.materialQuality.iron,
			);
		});

		it("has positive base values", () => {
			expect(materialsConfig.machineAssembly.baseEfficiency).toBeGreaterThan(0);
			expect(materialsConfig.machineAssembly.baseDurability).toBeGreaterThan(0);
		});
	});
});
