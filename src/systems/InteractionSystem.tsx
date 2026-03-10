/**
 * InteractionSystem — connects selection state to the radial action menu
 * and dispatches action callbacks to the appropriate core loop systems.
 *
 * Listens to onSelectionChange from selectionState, looks up entity traits,
 * fetches available actions from the actionRegistry, and shows/hides
 * the RadialActionMenu. When the player picks an action, the corresponding
 * system function is called (harvest, grab, drop, place, etc.).
 */

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import {
	belts,
	buildings,
	hackables,
	lightningRods,
	otters,
	signalRelays,
	units,
} from "../ecs/world";
import {
	type EntityCategory,
	getHoveredEntity,
} from "../input/ObjectSelectionSystem";
import { onSelectionChange } from "../input/selectionState";
import type { RadialAction } from "../ui/RadialActionMenu";
import {
	type ActionContext,
	getActionsForEntity,
} from "./actionRegistry";
import { getOccupiedSlots, placeCube } from "./cubePlacement";
import { getPlacementPreview, placeHeldCube } from "./cubeStacking";
import { getAllFurnaces, getFurnace, insertCubeIntoFurnace } from "./furnace";
import { startSmelting } from "./furnaceProcessing";
import {
	dropCube,
	getCube,
	getHeldCube,
	grabCube,
	throwCube,
	unregisterCube,
} from "./grabber";
import { startHarvesting } from "./harvesting";
import { getDeposit } from "./oreSpawner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuState {
	visible: boolean;
	actions: RadialAction[];
	entityId: string | null;
	entityTraits: string[];
	/** The entity category from ObjectSelectionSystem for visual context. */
	entityCategory: EntityCategory;
	position: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Trait resolution helpers
// ---------------------------------------------------------------------------

/**
 * Map an EntityCategory from ObjectSelectionSystem to trait strings
 * that the actionRegistry understands. This bridges the gap between
 * the hover/selection system and the action system.
 */
function traitsFromCategory(category: EntityCategory): string[] {
	switch (category) {
		case "unit":
			return ["Unit"];
		case "building":
			return ["Building"];
		case "miner":
			return ["Building"];
		case "processor":
			return ["Building"];
		case "belt":
			return ["Belt"];
		case "wire":
			return [];
		case "item":
			return [];
		case "otter":
			return ["Otter"];
		case "hackable":
			return ["Hackable"];
		case "signalRelay":
			return ["SignalRelay"];
		case "oreDeposit":
			return ["OreDeposit"];
		case "furnace":
			return ["Furnace", "Hopper"];
		default:
			return [];
	}
}

/** Resolve entity traits from its ID by checking all system registries. */
function resolveEntityTraits(entityId: string): string[] {
	const traits: string[] = [];

	// Check ore deposits
	const deposit = getDeposit(entityId);
	if (deposit) {
		traits.push("OreDeposit");
		return traits;
	}

	// Check furnaces
	const furnaces = getAllFurnaces();
	for (const f of furnaces) {
		if (f.id === entityId) {
			traits.push("Furnace", "Hopper");
			return traits;
		}
	}

	// Check cubes in grabber registry
	const cube = getCube(entityId);
	if (cube) {
		traits.push("MaterialCube");
		for (const t of cube.traits) {
			if (!traits.includes(t)) {
				traits.push(t);
			}
		}
		return traits;
	}

	// Check units (bots)
	for (const u of units) {
		if (u.id === entityId) {
			traits.push("Unit");
			return traits;
		}
	}

	// Check buildings — differentiate lightning rods
	for (const rod of lightningRods) {
		if (rod.id === entityId) {
			traits.push("LightningRod", "Building");
			return traits;
		}
	}

	for (const b of buildings) {
		if (b.id === entityId) {
			traits.push("Building");
			return traits;
		}
	}

	// Check signal relays
	for (const sr of signalRelays) {
		if (sr.id === entityId) {
			traits.push("SignalRelay");
			return traits;
		}
	}

	// Check hackables
	for (const h of hackables) {
		if (h.id === entityId) {
			traits.push("Hackable");
			return traits;
		}
	}

	// Check belts
	for (const belt of belts) {
		if (belt.id === entityId) {
			traits.push("Belt");
			return traits;
		}
	}

	// Check otters
	for (const otter of otters) {
		if (otter.id === entityId) {
			traits.push("Otter");
			return traits;
		}
	}

	// Fallback: use the hovered entity category from ObjectSelectionSystem
	const hovered = getHoveredEntity();
	if (hovered.entityId === entityId && hovered.entityType) {
		const categoryTraits = traitsFromCategory(hovered.entityType);
		for (const t of categoryTraits) {
			if (!traits.includes(t)) {
				traits.push(t);
			}
		}
	}

	return traits;
}

// ---------------------------------------------------------------------------
// Temp vectors
// ---------------------------------------------------------------------------

const _playerPos = new THREE.Vector3();
const _playerDir = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Exported state for external consumption
// ---------------------------------------------------------------------------

let menuState: MenuState = {
	visible: false,
	actions: [],
	entityId: null,
	entityTraits: [],
	entityCategory: null,
	position: { x: 0, y: 0 },
};

const menuListeners = new Set<() => void>();

/** Get the current menu state. */
export function getMenuState(): MenuState {
	return menuState;
}

/** Subscribe to menu state changes. Returns unsubscribe function. */
export function subscribeMenu(callback: () => void): () => void {
	menuListeners.add(callback);
	return () => {
		menuListeners.delete(callback);
	};
}

function notifyMenu(): void {
	for (const cb of menuListeners) {
		cb();
	}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractionSystem() {
	const { camera } = useThree();

	useEffect(() => {
		const unsubscribe = onSelectionChange(({ newId }) => {
			if (newId === null) {
				// Clear menu
				menuState = {
					visible: false,
					actions: [],
					entityId: null,
					entityTraits: [],
					entityCategory: null,
					position: { x: 0, y: 0 },
				};
				notifyMenu();
				return;
			}

			// Get the entity category from ObjectSelectionSystem for visual context
			const hovered = getHoveredEntity();
			const category: EntityCategory =
				hovered.entityId === newId ? hovered.entityType : null;

			// Resolve traits for the selected entity
			const traits = resolveEntityTraits(newId);
			if (traits.length === 0) {
				// Unknown entity type — no actions available
				menuState = {
					visible: false,
					actions: [],
					entityId: newId,
					entityTraits: [],
					entityCategory: category,
					position: { x: 0, y: 0 },
				};
				notifyMenu();
				return;
			}

			// Build action context for dynamic enable/disable
			const actionContext: ActionContext = {
				isHoldingCube: getHeldCube() !== null,
			};

			// If this is a furnace, add furnace-specific context
			if (traits.includes("Furnace")) {
				const furnaceData = getFurnace(newId);
				if (furnaceData) {
					actionContext.furnaceHasHopperItems =
						furnaceData.hopperQueue.length > 0;
					actionContext.furnaceIsProcessing = furnaceData.isProcessing;
				}
			}

			// If holding a cube, add the material type
			const heldId = getHeldCube();
			if (heldId) {
				const heldCubeData = getCube(heldId);
				if (heldCubeData) {
					actionContext.heldCubeMaterial = heldCubeData.material;
				}
			}

			// Get available actions
			const actions = getActionsForEntity(traits, actionContext);
			if (actions.length === 0) {
				menuState = {
					visible: false,
					actions: [],
					entityId: newId,
					entityTraits: traits,
					entityCategory: category,
					position: { x: 0, y: 0 },
				};
				notifyMenu();
				return;
			}

			// Show menu at screen center (crosshair position)
			menuState = {
				visible: true,
				actions,
				entityId: newId,
				entityTraits: traits,
				entityCategory: category,
				position: {
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
				},
			};
			notifyMenu();
		});

		return unsubscribe;
	}, []);

	// Handle action dispatch — called from the HUD layer
	useEffect(() => {
		const handleAction = (e: Event) => {
			const detail = (e as CustomEvent<{ actionId: string }>).detail;
			if (!detail?.actionId || !menuState.entityId) return;

			camera.getWorldPosition(_playerPos);
			camera.getWorldDirection(_playerDir);

			const playerPos = {
				x: _playerPos.x,
				y: _playerPos.y,
				z: _playerPos.z,
			};

			const playerDir = {
				x: _playerDir.x,
				y: _playerDir.y,
				z: _playerDir.z,
			};

			const entityId = menuState.entityId;

			switch (detail.actionId) {
				case "harvest": {
					const deposit = getDeposit(entityId);
					if (deposit) {
						startHarvesting(entityId, playerPos, () => deposit.position);
					}
					break;
				}
				case "grab": {
					grabCube(entityId, playerPos);
					break;
				}
				case "drop": {
					const dropPos = {
						x: _playerPos.x + _playerDir.x * 1.5,
						y: 0.25,
						z: _playerPos.z + _playerDir.z * 1.5,
					};
					dropCube(dropPos);
					break;
				}
				case "throw": {
					throwCube(playerDir, 10);
					break;
				}
				case "insert": {
					// Insert held cube into furnace hopper
					const insertHeldId = getHeldCube();
					if (insertHeldId) {
						const insertCube = getCube(insertHeldId);
						if (insertCube) {
							const inserted = insertCubeIntoFurnace(
								entityId,
								insertHeldId,
								insertCube.material,
								() => {
									unregisterCube(insertHeldId);
								},
							);
							if (inserted) {
								// Release held state (drop off-screen since cube is consumed)
								dropCube({ x: 0, y: -1000, z: 0 });
								// Auto-start smelting if furnace is powered and idle
								const insertFurnaces = getAllFurnaces();
								const targetFurnace = insertFurnaces.find(
									(f) => f.id === entityId,
								);
								if (
									targetFurnace &&
									targetFurnace.isPowered &&
									!targetFurnace.isProcessing
								) {
									startSmelting(entityId);
								}
							}
						}
					}
					break;
				}
				case "open": {
					// Dispatch event so CoreLoopHUD can show the furnace detail panel
					window.dispatchEvent(
						new CustomEvent("coreloop:furnace-open", {
							detail: { furnaceId: entityId },
						}),
					);
					break;
				}
				case "smelt": {
					// Start smelting the first item in the furnace's hopper
					const smeltFurnace = getFurnace(entityId);
					if (
						smeltFurnace &&
						smeltFurnace.isPowered &&
						!smeltFurnace.isProcessing &&
						smeltFurnace.hopperQueue.length > 0
					) {
						startSmelting(entityId);
					}
					break;
				}
				case "place": {
					// Place held cube at a grid position
					const occupied = getOccupiedSlots();
					const preview = getPlacementPreview(
						{
							point: {
								x: _playerPos.x + _playerDir.x * 2,
								y: 0,
								z: _playerPos.z + _playerDir.z * 2,
							},
							normal: { x: 0, y: 1, z: 0 },
						},
						occupied,
					);
					if (preview) {
						placeHeldCube(
							preview,
							getHeldCube,
							(pos) => dropCube(pos),
							placeCube,
							getCube,
						);
					}
					break;
				}
				case "inspect": {
					// Dispatch inspect event — consumed by HUD to show detail panel
					window.dispatchEvent(
						new CustomEvent("coreloop:inspect", {
							detail: {
								entityId,
								traits: menuState.entityTraits,
								category: menuState.entityCategory,
							},
						}),
					);
					break;
				}
				case "switch": {
					// Switch player control to another bot (Q key equivalent)
					window.dispatchEvent(
						new CustomEvent("coreloop:switch-bot", {
							detail: { entityId },
						}),
					);
					break;
				}
				case "command": {
					// Open command menu for a bot
					window.dispatchEvent(
						new CustomEvent("coreloop:command-bot", {
							detail: { entityId },
						}),
					);
					break;
				}
				case "power_toggle": {
					// Toggle power on a building
					window.dispatchEvent(
						new CustomEvent("coreloop:power-toggle", {
							detail: { entityId },
						}),
					);
					break;
				}
				case "disassemble": {
					// Disassemble a building
					window.dispatchEvent(
						new CustomEvent("coreloop:disassemble", {
							detail: { entityId },
						}),
					);
					break;
				}
				case "connect_wire": {
					// Start wire connection from this entity
					window.dispatchEvent(
						new CustomEvent("coreloop:connect-wire", {
							detail: { entityId },
						}),
					);
					break;
				}
				case "hack": {
					// Start hacking a hackable entity
					window.dispatchEvent(
						new CustomEvent("coreloop:hack", {
							detail: { entityId },
						}),
					);
					break;
				}
				default:
					break;
			}

			// Dismiss menu after action
			menuState = {
				visible: false,
				actions: [],
				entityId: null,
				entityTraits: [],
				entityCategory: null,
				position: { x: 0, y: 0 },
			};
			notifyMenu();
		};

		window.addEventListener("coreloop:action", handleAction);
		return () => {
			window.removeEventListener("coreloop:action", handleAction);
		};
	}, [camera]);

	return null;
}
