/**
 * Yuka type declarations for the board package.
 *
 * @types/yuka@0.7.4 has resolution issues with TS 6 + moduleResolution: "bundler".
 * These minimal declarations cover the subset we use.
 */

declare module "yuka" {
	export class Vector3 {
		x: number;
		y: number;
		z: number;
		constructor(x?: number, y?: number, z?: number);
		set(x: number, y: number, z: number): this;
		copy(v: Vector3): this;
		clone(): Vector3;
		add(v: Vector3): this;
		sub(v: Vector3): this;
		multiplyScalar(s: number): this;
		length(): number;
		distanceTo(v: Vector3): number;
		normalize(): this;
		equals(v: Vector3): boolean;
	}

	export class Node {
		index: number;
		constructor(index?: number);
	}

	export class Edge {
		from: number;
		to: number;
		cost: number;
		constructor(from?: number, to?: number, cost?: number);
	}

	export class NavNode extends Node {
		position: Vector3;
		userData: Record<string, unknown>;
		constructor(
			index?: number,
			position?: Vector3,
			userData?: Record<string, unknown>,
		);
	}

	export class NavEdge extends Edge {
		constructor(from?: number, to?: number, cost?: number);
	}

	export class Graph<TNode extends Node = Node, TEdge extends Edge = Edge> {
		digraph: boolean;
		addNode(node: TNode): number;
		addEdge(edge: TEdge): void;
		getNode(index: number): TNode;
		getEdge(from: number, to: number): TEdge;
		getNodes(result: TNode[]): TNode[];
		getEdgesOfNode(index: number, result: TEdge[]): TEdge[];
		getNodeCount(): number;
		getEdgeCount(): number;
		removeNode(node: TNode): this;
		removeEdge(edge: TEdge): this;
		hasNode(index: number): boolean;
		hasEdge(from: number, to: number): boolean;
		clear(): this;
	}

	export class GraphUtils {
		static generateGridGraph(
			size: number,
			segments: number,
		): Graph<NavNode, NavEdge>;
	}

	export class Vehicle extends MovingEntity {
		maxTurnRate: number;
		maxForce: number;
		mass: number;
		steering: SteeringManager;
	}

	export class MovingEntity extends GameEntity {
		velocity: Vector3;
		maxSpeed: number;
	}

	export class GameEntity {
		name: string;
		active: boolean;
		position: Vector3;
		rotation: Quaternion;
		scale: Vector3;
		up: Vector3;
		boundingRadius: number;
		neighbors: GameEntity[];
		start(): this;
		update(delta: number): this;
	}

	export class Quaternion {
		x: number;
		y: number;
		z: number;
		w: number;
		constructor(x?: number, y?: number, z?: number, w?: number);
	}

	export class EntityManager {
		add(entity: GameEntity): this;
		remove(entity: GameEntity): this;
		update(delta: number): this;
	}

	export class SteeringManager {
		add(behavior: SteeringBehavior): this;
	}

	export class SteeringBehavior {
		active: boolean;
		weight: number;
	}

	export class Think<T> {
		addEvaluator(evaluator: GoalEvaluator<T>): this;
		execute(): void;
		evaluate(owner: T): void;
	}

	export class GoalEvaluator<T> {
		characterBias: number;
		constructor(characterBias?: number);
		calculateDesirability(owner: T): number;
		setGoal(owner: T): void;
	}
}
