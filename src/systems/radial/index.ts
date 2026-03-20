/**
 * @package radial
 *
 * Radial menu action providers — class-specific action sets.
 *
 * Each provider file registers itself at module scope via registerRadialProvider().
 * Importing this barrel triggers all registrations.
 *
 * Providers:
 *   - moveProviders:      Move, Retreat, Relocate
 *   - harvestProviders:   Harvest, Salvage, Prospect
 *   - combatProviders:    Attack, Stage, Fortify, Guard, Charge, Flank, Overwatch
 *   - buildProviders:     Build, Fabricate, Synthesize, Upgrade
 *   - supportProviders:   Reveal, Signal, Repair, Buff, Deploy Beacon
 *   - diplomacyProvider:  Diplomacy (Declare War, Propose Alliance)
 */

// Re-export public API from providerState
export {
	setBuildProviderWorld,
	setProviderBoard,
	setProviderSelectedUnit,
} from "./providerState";

// Side-effect imports — each file registers its providers at module scope
import "./moveProviders";
import "./harvestProviders";
import "./combatProviders";
import "./buildProviders";
import "./supportProviders";
import "./diplomacyProvider";
