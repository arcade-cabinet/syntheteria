/**
 * @module useTurnState
 *
 * React hook that reads the global TurnStateKoota from the Koota entity,
 * giving reactive updates without subscribing to the raw turn state listener.
 *
 * Pattern: useQueryFirst(TurnStateKoota) → entity → useTrait(entity, TurnStateKoota)
 *
 * Falls back to default values when the entity is not yet initialized (pre-game).
 *
 * @exports useTurnState - Returns live TurnStateKoota trait data
 */
import { useQueryFirst, useTrait } from "koota/react";
import { TurnStateKoota } from "../../ecs/traits";

const EMPTY = {
	turnNumber: 0,
	phase: "player" as "player" | "ai_faction" | "environment",
	activeFaction: "player",
} as const;

/**
 * Returns the live TurnStateKoota trait from the singleton Koota entity.
 * Reactive: re-renders when turnNumber, phase, or activeFaction changes.
 * Returns default values before initTurnStateEntity() is called.
 */
export function useTurnState() {
	const entity = useQueryFirst(TurnStateKoota);
	const state = useTrait(entity ?? null, TurnStateKoota);
	return state ?? EMPTY;
}
