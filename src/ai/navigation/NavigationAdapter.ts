export interface NavigationPoint {
	x: number;
	y: number;
	z: number;
}

export interface NavigationPathNode {
	q: number;
	r: number;
}

export interface NavigationAdapter {
	readonly kind: "hex" | "square";
	findPath(start: NavigationPoint, goal: NavigationPoint): NavigationPathNode[];
}
