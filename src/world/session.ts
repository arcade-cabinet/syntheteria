import type { WorldSessionSnapshot } from "./snapshots";

export type ActiveWorldSession = WorldSessionSnapshot;

let activeWorldSession: WorldSessionSnapshot | null = null;

export function setActiveWorldSession(session: WorldSessionSnapshot) {
	activeWorldSession = session;
}

export function getActiveWorldSession() {
	return activeWorldSession;
}

export function requireActiveWorldSession() {
	if (!activeWorldSession) {
		throw new Error("No active world session is loaded.");
	}
	return activeWorldSession;
}

export function clearActiveWorldSession() {
	activeWorldSession = null;
}
