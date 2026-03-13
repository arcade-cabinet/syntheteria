import type {
	BotNavigationProfile,
	BotSteeringProfile,
} from "../../bots/types";

export interface SteeringTuning {
	maxForce: number;
	arrivalTolerance: number;
}

export interface NavigationTuning {
	mode: "ground_path" | "direct_line" | "service_grid";
}

export const STEERING_TUNING: Record<BotSteeringProfile, SteeringTuning> = {
	biped_scout: {
		maxForce: 14,
		arrivalTolerance: 0.35,
	},
	aerial_support: {
		maxForce: 18,
		arrivalTolerance: 0.6,
	},
	heavy_ground: {
		maxForce: 10,
		arrivalTolerance: 0.5,
	},
	stationary: {
		maxForce: 0,
		arrivalTolerance: 0.2,
	},
	feral_quadruped: {
		maxForce: 16,
		arrivalTolerance: 0.4,
	},
	cult_channeler: {
		maxForce: 8,
		arrivalTolerance: 0.45,
	},
};

export const NAVIGATION_TUNING: Record<BotNavigationProfile, NavigationTuning> =
	{
		sector_surface_standard: {
			mode: "ground_path",
		},
		sector_surface_heavy: {
			mode: "ground_path",
		},
		sector_aerial: {
			mode: "direct_line",
		},
		city_square_service: {
			mode: "service_grid",
		},
	};
