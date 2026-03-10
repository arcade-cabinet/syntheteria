/**
 * PBR material factory with texture loading and caching.
 *
 * Loads PBR texture sets (color, metalness, normal, roughness, displacement)
 * from disk and creates MeshStandardMaterials. Materials are cached by name
 * so identical requests return the same object.
 *
 * Supports creating tinted/modified variants from a base material, and
 * proper disposal of all cached textures and materials.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PBRTextureSet {
	/** Path to the color/albedo texture (e.g. "textures/materials/iron/Color.jpg") */
	color: string;
	/** Path to the metalness texture */
	metalness: string;
	/** Path to the OpenGL normal map */
	normal: string;
	/** Path to the roughness texture */
	roughness: string;
	/** Optional displacement/height map */
	displacement?: string;
}

export interface MaterialOptions {
	displacementScale?: number;
	metalness?: number;
	roughness?: number;
	envMapIntensity?: number;
	color?: THREE.Color;
	normalScale?: number;
}

export interface VariantModifications {
	/** Multiply the base color by this tint */
	colorMultiply?: THREE.Color;
	/** Add to the roughness value (clamped 0-1) */
	roughnessAdd?: number;
	/** Add to the metalness value (clamped 0-1) */
	metalnessAdd?: number;
}

// ---------------------------------------------------------------------------
// MaterialFactory
// ---------------------------------------------------------------------------

export class MaterialFactory {
	private cache = new Map<string, THREE.MeshStandardMaterial>();
	private textureCache = new Map<string, THREE.Texture>();
	private textureLoader = new THREE.TextureLoader();
	private pendingLoads = new Map<string, Promise<THREE.Texture>>();

	/**
	 * Load a single texture, returning a cached instance if already loaded.
	 * Uses a pending-loads map to avoid duplicate concurrent requests for
	 * the same path.
	 */
	private loadTexture(path: string): Promise<THREE.Texture> {
		const cached = this.textureCache.get(path);
		if (cached) return Promise.resolve(cached);

		const pending = this.pendingLoads.get(path);
		if (pending) return pending;

		const promise = new Promise<THREE.Texture>((resolve, reject) => {
			this.textureLoader.load(
				path,
				(texture) => {
					texture.wrapS = THREE.RepeatWrapping;
					texture.wrapT = THREE.RepeatWrapping;
					texture.colorSpace = path.includes("Color")
						? THREE.SRGBColorSpace
						: THREE.LinearSRGBColorSpace;
					this.textureCache.set(path, texture);
					this.pendingLoads.delete(path);
					resolve(texture);
				},
				undefined,
				(error) => {
					this.pendingLoads.delete(path);
					reject(error);
				},
			);
		});

		this.pendingLoads.set(path, promise);
		return promise;
	}

	/**
	 * Load a texture synchronously, returning a placeholder if not yet loaded
	 * and kicking off the async load in the background. The placeholder is a
	 * 1x1 white texture that will be replaced once loading completes.
	 */
	private loadTextureSync(path: string): THREE.Texture {
		const cached = this.textureCache.get(path);
		if (cached) return cached;

		// Return a placeholder and load in background
		const placeholder = new THREE.Texture();
		placeholder.wrapS = THREE.RepeatWrapping;
		placeholder.wrapT = THREE.RepeatWrapping;

		this.loadTexture(path).then((loaded) => {
			// Copy loaded data into the placeholder so any material referencing
			// it automatically picks up the real texture
			placeholder.image = loaded.image;
			placeholder.colorSpace = loaded.colorSpace;
			placeholder.needsUpdate = true;
		});

		return placeholder;
	}

	/**
	 * Create a PBR material from a texture set, loading textures asynchronously.
	 * Returns the material immediately with placeholder textures that will
	 * update once loaded.
	 *
	 * If a material with the given name already exists in cache, returns it.
	 */
	createMaterial(
		name: string,
		textures: PBRTextureSet,
		options?: MaterialOptions,
	): THREE.MeshStandardMaterial {
		const cached = this.cache.get(name);
		if (cached) return cached;

		const colorMap = this.loadTextureSync(textures.color);
		const metalnessMap = this.loadTextureSync(textures.metalness);
		const normalMap = this.loadTextureSync(textures.normal);
		const roughnessMap = this.loadTextureSync(textures.roughness);
		const displacementMap = textures.displacement
			? this.loadTextureSync(textures.displacement)
			: undefined;

		const normalScaleVal = options?.normalScale ?? 1.0;

		const material = new THREE.MeshStandardMaterial({
			map: colorMap,
			metalnessMap,
			normalMap,
			roughnessMap,
			displacementMap,
			displacementScale: options?.displacementScale ?? 0.02,
			metalness: options?.metalness ?? 0.5,
			roughness: options?.roughness ?? 0.5,
			envMapIntensity: options?.envMapIntensity ?? 1.0,
			normalScale: new THREE.Vector2(normalScaleVal, normalScaleVal),
		});

		if (options?.color) {
			material.color.copy(options.color);
		}

		this.cache.set(name, material);
		return material;
	}

	/**
	 * Create a PBR material asynchronously, waiting for all textures to finish
	 * loading before resolving. Useful when you need to guarantee textures are
	 * ready (e.g. for screenshots or initial scene setup).
	 */
	async createMaterialAsync(
		name: string,
		textures: PBRTextureSet,
		options?: MaterialOptions,
	): Promise<THREE.MeshStandardMaterial> {
		const cached = this.cache.get(name);
		if (cached) return cached;

		const loadPromises: Promise<THREE.Texture>[] = [
			this.loadTexture(textures.color),
			this.loadTexture(textures.metalness),
			this.loadTexture(textures.normal),
			this.loadTexture(textures.roughness),
		];

		if (textures.displacement) {
			loadPromises.push(this.loadTexture(textures.displacement));
		}

		const loaded = await Promise.all(loadPromises);
		const [colorMap, metalnessMap, normalMap, roughnessMap] = loaded;
		const displacementMap = textures.displacement ? loaded[4] : undefined;

		const normalScaleVal = options?.normalScale ?? 1.0;

		const material = new THREE.MeshStandardMaterial({
			map: colorMap,
			metalnessMap,
			normalMap,
			roughnessMap,
			displacementMap,
			displacementScale: options?.displacementScale ?? 0.02,
			metalness: options?.metalness ?? 0.5,
			roughness: options?.roughness ?? 0.5,
			envMapIntensity: options?.envMapIntensity ?? 1.0,
			normalScale: new THREE.Vector2(normalScaleVal, normalScaleVal),
		});

		if (options?.color) {
			material.color.copy(options.color);
		}

		this.cache.set(name, material);
		return material;
	}

	/**
	 * Get a previously cached material by name.
	 * Returns undefined if no material with that name has been created.
	 */
	getMaterial(name: string): THREE.MeshStandardMaterial | undefined {
		return this.cache.get(name);
	}

	/**
	 * Create a variant of an existing material by cloning it and applying
	 * modifications (color tint, roughness/metalness adjustments).
	 *
	 * The base material must already exist in cache. The variant is cached
	 * under `variantName`.
	 */
	createVariant(
		baseName: string,
		variantName: string,
		modifications: VariantModifications,
	): THREE.MeshStandardMaterial {
		const cachedVariant = this.cache.get(variantName);
		if (cachedVariant) return cachedVariant;

		const base = this.cache.get(baseName);
		if (!base) {
			throw new Error(
				`MaterialFactory: base material "${baseName}" not found in cache. ` +
					"Create it with createMaterial() first.",
			);
		}

		const variant = base.clone();

		if (modifications.colorMultiply) {
			variant.color.multiply(modifications.colorMultiply);
		}

		if (modifications.roughnessAdd !== undefined) {
			variant.roughness = Math.max(
				0,
				Math.min(1, variant.roughness + modifications.roughnessAdd),
			);
		}

		if (modifications.metalnessAdd !== undefined) {
			variant.metalness = Math.max(
				0,
				Math.min(1, variant.metalness + modifications.metalnessAdd),
			);
		}

		this.cache.set(variantName, variant);
		return variant;
	}

	/**
	 * Dispose all cached materials and their associated textures.
	 * Call this when the game shuts down or on scene teardown to free GPU memory.
	 */
	dispose(): void {
		for (const material of this.cache.values()) {
			material.dispose();
		}
		this.cache.clear();

		for (const texture of this.textureCache.values()) {
			texture.dispose();
		}
		this.textureCache.clear();

		this.pendingLoads.clear();
	}
}

/** Singleton instance for use across the application. */
export const materialFactory = new MaterialFactory();
