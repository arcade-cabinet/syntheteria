export type SyntheteriaTaskKind =
	| "move_to_point"
	| "move_to_entity"
	| "route_service"
	| "claim_node"
	| "travel_to_poi"
	| "enter_city"
	| "return_from_city"
	| "scavenge_point"
	| "load_cargo"
	| "unload_cargo"
	| "attack_target"
	| "repair_target"
	| "hack_target"
	| "call_lightning"
	| "idle";

export interface SyntheteriaTaskDefinition {
	id: string;
	kind: SyntheteriaTaskKind;
	phase: string;
	payload: Record<string, unknown>;
}
