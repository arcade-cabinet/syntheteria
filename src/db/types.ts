export interface SyncRunResult {
	lastInsertRowId: number;
}

export interface SyncDatabase {
	execSync(source: string): void;
	getAllSync<T>(source: string, ...params: unknown[]): T[];
	getFirstSync<T>(source: string, ...params: unknown[]): T | null;
	runSync(source: string, ...params: unknown[]): SyncRunResult;
}
