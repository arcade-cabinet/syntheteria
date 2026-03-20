import type { AgentRuntimeContract } from "./types";

export interface CultistAgentContract extends AgentRuntimeContract {
	role: "cultist";
	canCallLightning: boolean;
	formationId: string | null;
}
