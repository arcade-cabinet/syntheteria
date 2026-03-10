/**
 * Discovery system — manages discoverable locations in the world.
 *
 * Discovery sites are placed during world generation. When a player unit
 * enters the proximity range, scanning begins. After scanTime ticks,
 * the discovery is revealed and its reward is granted.
 *
 * Camera-equipped bots scan at double speed (half scan time).
 * Each discovery can only be claimed once.
 *
 * All tunables sourced from config/discoveries.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveryReward {
	type: string;
	value: string | number;
	amount?: number;
}

export interface DiscoveryTypeConfig {
	discoveryReward: DiscoveryReward;
	proximityRange: number;
	scanTime: number;
}

export interface DiscoverySite {
	id: string;
	x: number;
	z: number;
	type: string;
	scanProgress: number;
	discovered: boolean;
	discoveredBy: string | null;
}

export interface DiscoveryEvent {
	siteId: string;
	type: string;
	reward: DiscoveryReward;
	faction: string;
}

export interface UnitInfo {
	id: string;
	faction: string;
	x: number;
	z: number;
	hasCamera: boolean;
}

export type GetUnitsFunc = () => UnitInfo[];
export type OnDiscoveryFunc = (event: DiscoveryEvent) => void;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const discoveryTypes = config.discoveries.types as unknown as Record<
	string,
	DiscoveryTypeConfig
>;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let sites: DiscoverySite[] = [];
let nextSiteId = 1;
let discoveryEvents: DiscoveryEvent[] = [];

/** Pluggable unit query — set by integration layer. */
let getUnits: GetUnitsFunc = () => [];

/** Pluggable discovery callback — set by integration layer. */
let onDiscovery: OnDiscoveryFunc = () => {};

// ---------------------------------------------------------------------------
// Configuration hooks
// ---------------------------------------------------------------------------

export function setGetUnits(fn: GetUnitsFunc): void {
	getUnits = fn;
}

export function setOnDiscovery(fn: OnDiscoveryFunc): void {
	onDiscovery = fn;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist2d(x1: number, z1: number, x2: number, z2: number): number {
	const dx = x1 - x2;
	const dz = z1 - z2;
	return Math.sqrt(dx * dx + dz * dz);
}

function getTypeConfig(type: string): DiscoveryTypeConfig | null {
	return discoveryTypes[type] ?? null;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Place a discovery site in the world.
 * Returns the site ID.
 */
export function placeDiscoverySite(x: number, z: number, type: string): string {
	const id = `discovery_${nextSiteId++}`;
	sites.push({
		id,
		x,
		z,
		type,
		scanProgress: 0,
		discovered: false,
		discoveredBy: null,
	});
	return id;
}

/**
 * Run the discovery system tick.
 * Checks unit proximity to undiscovered sites and advances scan timers.
 */
export function discoverySystem(): void {
	const units = getUnits();
	const newEvents: DiscoveryEvent[] = [];

	for (const site of sites) {
		if (site.discovered) continue;

		const typeConfig = getTypeConfig(site.type);
		if (!typeConfig) continue;

		// Find the closest unit within proximity range
		let bestUnit: UnitInfo | null = null;
		let bestDist = Infinity;

		for (const unit of units) {
			const d = dist2d(unit.x, unit.z, site.x, site.z);
			if (d <= typeConfig.proximityRange && d < bestDist) {
				bestDist = d;
				bestUnit = unit;
			}
		}

		if (bestUnit) {
			// Camera-equipped bots scan at double speed
			const scanIncrement = bestUnit.hasCamera ? 2 : 1;
			site.scanProgress += scanIncrement;

			if (site.scanProgress >= typeConfig.scanTime) {
				site.discovered = true;
				site.discoveredBy = bestUnit.faction;

				const event: DiscoveryEvent = {
					siteId: site.id,
					type: site.type,
					reward: typeConfig.discoveryReward,
					faction: bestUnit.faction,
				};
				newEvents.push(event);
				onDiscovery(event);
			}
		}
	}

	discoveryEvents = newEvents;
}

/**
 * Get all discovery sites in the world.
 */
export function getDiscoveries(): DiscoverySite[] {
	return [...sites];
}

/**
 * Get all sites discovered by a specific faction.
 */
export function getDiscoveredSites(faction: string): DiscoverySite[] {
	return sites.filter(
		(s) => s.discovered && s.discoveredBy === faction,
	);
}

/**
 * Get discovery events from the last tick.
 */
export function getDiscoveryEvents(): DiscoveryEvent[] {
	return discoveryEvents;
}

/**
 * Reset all discovery state. Intended for tests and world reset.
 */
export function resetDiscoveries(): void {
	sites = [];
	nextSiteId = 1;
	discoveryEvents = [];
	getUnits = () => [];
	onDiscovery = () => {};
}
