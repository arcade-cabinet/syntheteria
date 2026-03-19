import type { AssetModule } from "./assetUri";

// Public-dir assets — served at root path, use string constants (not ?url imports)
const ArachnoidModel = "/assets/models/robots/hostile/Arachnoid.glb";
const MechaTrooperModel = "/assets/models/robots/hostile/MechaTrooper.glb";
const QuadrupedTankModel = "/assets/models/robots/hostile/QuadrupedTank.glb";
const MechaGolemModel = "/assets/models/robots/industrial/MechaGolem.glb";
const MobileStorageBotModel =
	"/assets/models/robots/industrial/MobileStorageBot.glb";
const CompanionBotModel = "/assets/models/robots/player/Companion-bot.glb";
const FieldFighterModel = "/assets/models/robots/player/FieldFighter.glb";
const Mecha01Model = "/assets/models/robots/player/Mecha01.glb";
const ReconBotModel = "/assets/models/robots/player/ReconBot.glb";

export const modelAssets: Record<string, AssetModule> = {
	"Arachnoid.glb": ArachnoidModel,
	"Companion-bot.glb": CompanionBotModel,
	"FieldFighter.glb": FieldFighterModel,
	"Mecha01.glb": Mecha01Model,
	"MechaGolem.glb": MechaGolemModel,
	"MechaTrooper.glb": MechaTrooperModel,
	"MobileStorageBot.glb": MobileStorageBotModel,
	"QuadrupedTank.glb": QuadrupedTankModel,
	"ReconBot.glb": ReconBotModel,
};
