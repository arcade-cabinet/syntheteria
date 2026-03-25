// Type shims for untyped dependencies

declare module "yuka" {
	export class GameEntity {
		id: number;
	}

	export class MovingEntity extends GameEntity {
		maxSpeed: number;
	}

	export class Vehicle extends MovingEntity {}

	export class GoalEvaluator<T extends GameEntity = GameEntity> {
		characterBias: number;
		constructor(characterBias?: number);
		calculateDesirability(owner: T): number;
		setGoal(owner: T): void;
	}

	export class Goal<T extends GameEntity = GameEntity> {
		owner: T;
	}

	export class CompositeGoal<
		T extends GameEntity = GameEntity,
	> extends Goal<T> {
		addSubgoal(goal: Goal<T>): this;
	}

	export class Think<
		T extends GameEntity = GameEntity,
	> extends CompositeGoal<T> {
		constructor(owner: T);
		addEvaluator(evaluator: GoalEvaluator<T>): this;
		arbitrate(): this;
	}

	export class EntityManager {
		add(entity: GameEntity): this;
		remove(entity: GameEntity): this;
	}
}

declare module "sql.js" {
	export interface Statement {
		bind(params?: (string | number | null | Uint8Array)[]): boolean;
		step(): boolean;
		getAsObject(): Record<string, unknown>;
		free(): void;
	}

	export interface Database {
		run(
			sql: string,
			params?: (string | number | null | Uint8Array)[],
		): Database;
		prepare(sql: string): Statement;
		close(): void;
		export(): Uint8Array;
	}

	export interface SqlJsStatic {
		Database: new (data?: ArrayLike<number>) => Database;
	}

	export default function initSqlJs(config?: {
		locateFile?: (file: string) => string;
	}): Promise<SqlJsStatic>;
}

// Pure JS (ASM.js) build of sql.js — no WASM needed
declare module "sql.js/dist/sql-asm.js" {
	import type { SqlJsStatic } from "sql.js";
	export default function initSqlJs(): Promise<SqlJsStatic>;
}
