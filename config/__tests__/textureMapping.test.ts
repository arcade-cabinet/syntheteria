import textureMappingConfig from "../textureMapping.json";

describe("textureMapping.json", () => {
	const materials = Object.entries(textureMappingConfig.materials);

	it("has at least 5 material mappings", () => {
		expect(materials.length).toBeGreaterThanOrEqual(5);
	});

	it("each material has required fields", () => {
		for (const [, mat] of materials) {
			expect(typeof mat.displayName).toBe("string");
			expect(typeof mat.description).toBe("string");
			expect(typeof mat.textureSet).toBe("string");
			expect(typeof mat.sourcePath).toBe("string");
			expect(typeof mat.localPath).toBe("string");
			expect(mat.files).toBeDefined();
		}
	});

	it("each material has at least color, normal, and roughness files", () => {
		for (const [, mat] of materials) {
			expect(typeof mat.files.color).toBe("string");
			expect(typeof mat.files.normal).toBe("string");
			expect(typeof mat.files.roughness).toBe("string");
		}
	});

	it("core materials are mapped", () => {
		expect(textureMappingConfig.materials.iron).toBeDefined();
		expect(textureMappingConfig.materials.copper).toBeDefined();
		expect(textureMappingConfig.materials.steel).toBeDefined();
	});

	it("has metadata fields", () => {
		expect(typeof textureMappingConfig.description).toBe("string");
		expect(typeof textureMappingConfig.sourceLibrary).toBe("string");
		expect(typeof textureMappingConfig.resolution).toBe("string");
	});
});
