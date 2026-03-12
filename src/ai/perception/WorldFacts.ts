export interface WorldFact {
	key: string;
	value: unknown;
}

export interface WorldFactSnapshot {
	agentId: string;
	facts: WorldFact[];
}

export function createWorldFactSnapshot(
	agentId: string,
	facts: WorldFact[],
): WorldFactSnapshot {
	return {
		agentId,
		facts: facts.map((fact) => ({ ...fact })),
	};
}
