/**
 * PBR material factory with texture loading and caching.
 *
 * Loads PBR texture sets (color, metalness, normal, roughness, displacement)
 * from disk and creates MeshStandardMaterials. Materials are cached by name
 * so identical requests return the same object.
 *
 * Supports creating tinted/modified variants from a base material, and
 * proper disposal of all cached textures and materials.
 *
 * JSON-driven API:
 *   - createFromSpec(name, spec)  — build a material from a MaterialSpec
 *   - createForFaction(faction)   — tinted material from factionVisuals config
 */

import * as THREE from "three";
import { config } from "../../../config";

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

/**
 * A JSON-serialisable material specification used by createFromSpec.
 *
 * Maps directly to the entries in config/textureMapping.json `materials`
 * combined with PBR option overrides.
 *
 * PBR defaults are read from config/materials.json when a matching key
 * exists there; spec.options override those defaults.
 */
export interface MaterialSpec {
	/**
	 * Key into config.textureMapping.materials that provides the texture set.
	 * Also used to look up PBR defaults from config/materials.json when present.
	 * e.g. "iron", "steel", "rust".
	 */
	textureMappingKey: string;
	/** PBR options to apply on top of the config.materials defaults. */
	options?: MaterialOptions;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Read a texture mapping entry from config and return a PBRTextureSet.
 * Falls back to empty paths when the key is unknown so callers get a
 * graceful fallback rather than a hard crash.
 */
function textureMappingToPBRSet(key: string): PBRTextureSet {
	const materials = config.textureMapping.materials as Record<
		string,
		{
			localPath: string;
			files: {
				color?: string;
				metalness?: string;
				normal?: string;
				roughness?: string;
				displacement?: string;
			};
		}
	>;
	const entry = materials[key];
	if (!entry) {
		console.warn(
			`MaterialFactory.createFromSpec: unknown textureMapping key "${key}". Using empty texture paths.`,
		);
		return { color: "", metalness: "", normal: "", roughness: "" };
	}

	const base = entry.localPath.endsWith("/")
		? entry.localPath
		: `${entry.localPath}/`;
	const f = entry.files;
	// For non-metallic materials the config omits `metalness`; fall back to the
	// color texture so MeshStandardMaterial still gets a valid map.
	return {
		color: f.color ? `${base}${f.color}` : "",
		metalness: f.metalness
			? `${base}${f.metalness}`
			: f.color
				? `${base}${f.color}`
				: "",
		normal: f.normal ? `${base}${f.normal}` : "",
		roughness: f.roughness ? `${base}${f.roughness}` : "",
		displacement: f.displacement ? `${base}${f.displacement}` : undefined,
	};
}

/**
 * Read PBR defaults (metalness, roughness, color) from config/materials.json
 * for a given key. Returns null if the key is not present.
 *
 * This is used by createFromSpec to source PBR parameters from config rather
 * than hardcoded 0.5/0.5 fallbacks.
 */
function materialsConfigToPBROptions(key: string): MaterialOptions | null {
	const materials = config.materials as Record<
		string,
		{ metalness?: number; roughness?: number; color?: string }
	>;
	const entry = materials[key];
	if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
	// Only simple PBR entries have these numeric keys (skip complex objects like machineAssembly)
	if (
		entry.metalness === undefined &&
		entry.roughness === undefined &&
		entry.color === undefined
	) {
		return null;
	}
	const opts: MaterialOptions = {};
	if (entry.metalness !== undefined) opts.metalness = entry.metalness;
	if (entry.roughness !== undefined) opts.roughness = entry.roughness;
	if (entry.color !== undefined) opts.color = new THREE.Color(entry.color);
	return opts;
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
	 * Create a 1x1 fallback texture with a given color.
	 * Used when texture loading fails to prevent rendering crashes.
	 */
	private createFallbackTexture(
		hex = 0x808080,
		colorSpace: THREE.ColorSpace = THREE.LinearSRGBColorSpace,
	): THREE.Texture {
		const canvas = typeof document !== "undefined"
			? document.createElement("canvas")
			: null;
		if (canvas) {
			canvas.width = 1;
			canvas.height = 1;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const r = (hex >> 16) & 0xff;
				const g = (hex >> 8) & 0xff;
				const b = hex & 0xff;
				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(0, 0, 1, 1);
			}
			const texture = new THREE.CanvasTexture(canvas);
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.colorSpace = colorSpace;
			return texture;
		}
		// SSR/Node fallback — return a blank texture
		const texture = new THREE.Texture();
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.colorSpace = colorSpace;
		return texture;
	}

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
	 * Load a texture with fallback — resolves to a fallback texture
	 * instead of rejecting on failure.
	 */
	private loadTextureWithFallback(path: string): Promise<THREE.Texture> {
		return this.loadTexture(path).catch((error) => {
			console.warn(
				`MaterialFactory: failed to load texture "${path}", using fallback.`,
				error,
			);
			const isColor = path.includes("Color");
			const fallback = this.createFallbackTexture(
				isColor ? 0x808080 : 0x8080ff,
				isColor ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace,
			);
			this.textureCache.set(path, fallback);
			return fallback;
		});
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

		this.loadTexture(path)
			.then((loaded) => {
				// Copy loaded data into the placeholder so any material referencing
				// it automatically picks up the real texture
				placeholder.image = loaded.image;
				placeholder.colorSpace = loaded.colorSpace;
				placeholder.needsUpdate = true;
			})
			.catch((error) => {
				console.warn(
					`MaterialFactory: failed to load texture "${path}", keeping placeholder.`,
					error,
				);
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
			this.loadTextureWithFallback(textures.color),
			this.loadTextureWithFallback(textures.metalness),
			this.loadTextureWithFallback(textures.normal),
			this.loadTextureWithFallback(textures.roughness),
		];

		if (textures.displacement) {
			loadPromises.push(this.loadTextureWithFallback(textures.displacement));
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
	 * Create a PBR material from a JSON-driven MaterialSpec.
	 *
	 * Resolves the PBR texture set from config.textureMapping using
	 * spec.textureMappingKey. PBR defaults (metalness, roughness, color) are
	 * read from config/materials.json when a matching key exists there.
	 * spec.options override those config defaults.
	 *
	 * This is the preferred API when material definitions live in config
	 * rather than being hardcoded in rendering code.
	 *
	 * @param name - Cache key for this material
	 * @param spec - Descriptor with a textureMapping key and optional PBR overrides
	 */
	createFromSpec(name: string, spec: MaterialSpec): THREE.MeshStandardMaterial {
		const cached = this.cache.get(name);
		if (cached) return cached;

		const textures = textureMappingToPBRSet(spec.textureMappingKey);
		// Merge: config.materials defaults < spec.options
		const configDefaults = materialsConfigToPBROptions(spec.textureMappingKey);
		const mergedOptions: MaterialOptions = {
			...configDefaults,
			...spec.options,
		};
		return this.createMaterial(name, textures, mergedOptions);
	}

	/**
	 * Create a PBR material for a building type using config/rendering.json
	 * buildingPBR definitions.
	 *
	 * Looks up config.rendering.buildingPBR[buildingType] for texture key,
	 * metalness, roughness, and tint. Falls back to a generic iron material
	 * if the building type is not found.
	 *
	 * @param buildingType - Building type key from config.rendering.buildingPBR
	 */
	createForBuilding(buildingType: string): THREE.MeshStandardMaterial {
		const cacheKey = `building_${buildingType}`;
		const cached = this.cache.get(cacheKey);
		if (cached) return cached;

		const buildingPBR = (
			config.rendering as {
				buildingPBR?: Record<
					string,
					{
						texture: string;
						metalness: number;
						roughness: number;
						tint: string;
					}
				>;
			}
		).buildingPBR;

		const entry = buildingPBR?.[buildingType];
		if (!entry) {
			console.warn(
				`MaterialFactory.createForBuilding: unknown building type "${buildingType}". Using iron fallback.`,
			);
			return this.createFromSpec(cacheKey, { textureMappingKey: "iron" });
		}

		const options: MaterialOptions = {
			metalness: entry.metalness,
			roughness: entry.roughness,
			color: new THREE.Color(Number(entry.tint)),
		};

		return this.createFromSpec(cacheKey, {
			textureMappingKey: entry.texture,
			options,
		});
	}

	/**
	 * Create a faction-themed PBR material from config.factionVisuals.
	 *
	 * Looks up the faction entry in config.factionVisuals and creates a
	 * material tinted with the faction's primaryColor. Uses the "iron"
	 * texture set from config.textureMapping as the base — callers can
	 * override this by passing a different textureMappingKey.
	 *
	 * @param faction     - Key from config.factionVisuals (e.g. "reclaimers")
	 * @param texMappingKey - Optional texture base (defaults to "iron")
	 * @param extraOptions  - Additional PBR options to merge
	 */
	createForFaction(
		faction: string,
		texMappingKey = "iron",
		extraOptions?: Omit<MaterialOptions, "color">,
	): THREE.MeshStandardMaterial {
		const cacheKey = `faction_${faction}_${texMappingKey}`;
		const cached = this.cache.get(cacheKey);
		if (cached) return cached;

		const factionVisuals = config.factionVisuals as Record<
			string,
			{
				primaryColor: string;
				accentColor?: string;
				rustLevel?: number;
				emissiveGlow?: number;
				anodized?: boolean;
				brushedMetal?: boolean;
			}
		>;
		const visual = factionVisuals[faction];
		if (!visual) {
			console.warn(
				`MaterialFactory.createForFaction: unknown faction "${faction}". Using default material.`,
			);
			return this.createFromSpec(cacheKey, { textureMappingKey: texMappingKey });
		}

		// Faction-specific PBR tweaks driven by visual traits
		const rustLevel = visual.rustLevel ?? 0;
		const emissiveGlow = visual.emissiveGlow ?? 0;
		const anodized = visual.anodized ?? false;
		const brushedMetal = visual.brushedMetal ?? false;

		const baseMetalness = anodized ? 0.7 : brushedMetal ? 0.85 : emissiveGlow > 0 ? 0.9 : 0.75;
		const baseRoughness = brushedMetal ? 0.35 : anodized ? 0.25 : 0.3 + rustLevel * 0.5;

		const options: MaterialOptions = {
			...extraOptions,
			color: new THREE.Color(visual.primaryColor),
			metalness: extraOptions?.metalness ?? baseMetalness,
			roughness: extraOptions?.roughness ?? baseRoughness,
		};

		const textures = textureMappingToPBRSet(texMappingKey);
		return this.createMaterial(cacheKey, textures, options);
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
