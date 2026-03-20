export interface SteeringPolicy {
	name: string;
	arrivalTolerance: number;
	maxSpeedMultiplier: number;
	repathDistance: number;
}

export const STEERING_POLICIES = {
	arrive: {
		name: "arrive",
		arrivalTolerance: 0.25,
		maxSpeedMultiplier: 1,
		repathDistance: 0.5,
	},
	followPath: {
		name: "followPath",
		arrivalTolerance: 0.2,
		maxSpeedMultiplier: 1,
		repathDistance: 1,
	},
	flee: {
		name: "flee",
		arrivalTolerance: 0,
		maxSpeedMultiplier: 1.2,
		repathDistance: 1.5,
	},
	pursuit: {
		name: "pursuit",
		arrivalTolerance: 0.1,
		maxSpeedMultiplier: 1.15,
		repathDistance: 0.75,
	},
	obstacleAvoidance: {
		name: "obstacleAvoidance",
		arrivalTolerance: 0,
		maxSpeedMultiplier: 0.9,
		repathDistance: 0.5,
	},
} as const satisfies Record<string, SteeringPolicy>;
