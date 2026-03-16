import ArachnoidModel from "../../assets/models/robots/hostile/Arachnoid.glb?url";
import MechaTrooperModel from "../../assets/models/robots/hostile/MechaTrooper.glb?url";
import QuadrupedTankModel from "../../assets/models/robots/hostile/QuadrupedTank.glb?url";
import MechaGolemModel from "../../assets/models/robots/industrial/MechaGolem.glb?url";
import MobileStorageBotModel from "../../assets/models/robots/industrial/MobileStorageBot.glb?url";
import CompanionBotModel from "../../assets/models/robots/player/Companion-bot.glb?url";
import FieldFighterModel from "../../assets/models/robots/player/FieldFighter.glb?url";
import Mecha01Model from "../../assets/models/robots/player/Mecha01.glb?url";
import ReconBotModel from "../../assets/models/robots/player/ReconBot.glb?url";
import type { AssetModule } from "./assetUri";

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
