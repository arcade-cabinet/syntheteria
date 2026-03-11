/**
 * Pure utility functions for bot rendering.
 *
 * Extracted from UnitRenderer so they can be unit-tested without importing
 * React Three Fiber or drei (which require a WebGL context).
 */

import * as THREE from "three";
import { config } from "../../config";
import { generateBotMesh, disposeBotGroup } from "./procgen/BotGenerator";

// ---------------------------------------------------------------------------
// Seed derivation
// ---------------------------------------------------------------------------

/**
 * Derive a stable, non-negative integer seed from an entity id string.
 * Uses FNV-1a 32-bit hash for good distribution with short strings.
 */
export function entitySeed(id: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = (Math.imul(h, 0x01000193) >>> 0);
	}
	return h;
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

/** Build a cache key for a bot group template. */
export function getBotCacheKey(botType: string, faction: string, seed: number): string {
	return `${botType}:${faction}:${seed}`;
}

// ---------------------------------------------------------------------------
// Bot geometry template cache
// ---------------------------------------------------------------------------

/**
 * Module-level cache of generated bot Groups keyed by "botType:faction:seed".
 *
 * The cached group is a template — each entity instance clones it so
 * world transforms are independent, while underlying geometries and materials
 * are shared via Three.js reference counting.
 *
 * Call clearBotGeometryCache() on scene teardown to free GPU memory.
 */
const botTemplateCache = new Map<string, THREE.Group>();

/**
 * Get or create a cached bot template Group for the given parameters.
 * The returned group is a template — callers must clone it before placing
 * it in the scene.
 */
export function getBotTemplate(
	botType: string,
	faction: string,
	seed: number,
): THREE.Group {
	const key = getBotCacheKey(botType, faction, seed);
	let template = botTemplateCache.get(key);
	if (!template) {
		template = generateBotMesh(botType, faction, seed);
		botTemplateCache.set(key, template);
	}
	return template;
}

/**
 * Dispose all cached bot templates and clear the cache.
 * Call this when the game scene unmounts to free GPU memory.
 */
export function clearBotGeometryCache(): void {
	for (const group of botTemplateCache.values()) {
		disposeBotGroup(group);
	}
	botTemplateCache.clear();
}

// ---------------------------------------------------------------------------
// Locomotion bob animation
// ---------------------------------------------------------------------------

/**
 * Returns the Y bob offset for a bot at the given clock time.
 *
 * Legged bots get a step-rhythm bob; treaded/tracked bots get a slight
 * continuous rumble; hovering bots float with a slow sine drift.
 * Stationary bots (not moving) return 0.
 */
export function getBobOffset(
	faction: string,
	isMoving: boolean,
	time: number,
): number {
	if (!isMoving) return 0;

	// Hover bots (volt_collective): slow sinusoidal float, amplitude 0.04 m
	if (faction === "volt_collective") {
		return Math.sin(time * 1.2) * 0.04;
	}

	// Legged bots (signal_choir, player): step rhythm, amplitude 0.05 m
	if (faction === "signal_choir" || faction === "player") {
		return Math.abs(Math.sin(time * 4.5)) * 0.05;
	}

	// Treaded/tracked bots (reclaimers, iron_creed, feral, others): rumble, amplitude 0.015 m
	return Math.sin(time * 6.0) * 0.015;
}

// ---------------------------------------------------------------------------
// Faction visual utilities
// ---------------------------------------------------------------------------

/**
 * Faction visual entry shape from config/factionVisuals.json.
 * Optional fields are used for PBR material tweaks.
 */
export interface FactionVisualEntry {
	chassisStyle?: string;
	headStyle?: string;
	armStyle?: string;
	locomotion?: string;
	primaryColor: string;
	accentColor: string;
	rustLevel?: number;
	emissiveGlow?: number;
	anodized?: boolean;
	brushedMetal?: boolean;
}

/**
 * Return the faction visual config entry for the given faction key.
 * Returns null when the faction is unknown.
 */
export function getFactionVisuals(faction: string): FactionVisualEntry | null {
	const visuals = config.factionVisuals as Record<string, FactionVisualEntry>;
	return visuals[faction] ?? null;
}

/**
 * Return the accent color hex number for a faction.
 *
 * The accent color is used for selection rings, power LED tints, and
 * other faction-specific highlighting. Falls back to a neutral gold when
 * the faction is not found in config.
 *
 * @param faction - Key from config.factionVisuals (e.g. "reclaimers")
 */
export function getFactionAccentColor(faction: string): number {
	const entry = getFactionVisuals(faction);
	if (!entry) return 0xffaa00; // neutral gold fallback
	// Parse CSS hex string (e.g. "#DAA520") to number
	return parseInt(entry.accentColor.replace("#", ""), 16);
}

/**
 * Return the primary color as a THREE.Color for a faction.
 * Falls back to mid-gray when the faction is unknown.
 */
export function getFactionPrimaryColor(faction: string): THREE.Color {
	const entry = getFactionVisuals(faction);
	if (!entry) return new THREE.Color(0x888888);
	return new THREE.Color(entry.primaryColor);
}

/**
 * Return the emissive glow intensity for a faction (0–1 range).
 * Derived from emissiveGlow field, or a small non-zero base for anodized
 * and brushedMetal factions.
 */
export function getFactionEmissiveIntensity(faction: string): number {
	const entry = getFactionVisuals(faction);
	if (!entry) return 0.1;
	if (entry.emissiveGlow !== undefined) return entry.emissiveGlow;
	if (entry.anodized) return 0.08;
	if (entry.brushedMetal) return 0.05;
	return 0.05;
}
