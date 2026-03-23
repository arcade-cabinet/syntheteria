import ArachnoidModel from "../../assets/models/robots/hostile/Arachnoid.glb";
import MechaTrooperModel from "../../assets/models/robots/hostile/MechaTrooper.glb";
import QuadrupedTankModel from "../../assets/models/robots/hostile/QuadrupedTank.glb";
import MechaGolemModel from "../../assets/models/robots/industrial/MechaGolem.glb";
import MobileStorageBotModel from "../../assets/models/robots/industrial/MobileStorageBot.glb";
import CompanionBotModel from "../../assets/models/robots/player/Companion-bot.glb";
import FieldFighterModel from "../../assets/models/robots/player/FieldFighter.glb";
import Mecha01Model from "../../assets/models/robots/player/Mecha01.glb";
import ReconBotModel from "../../assets/models/robots/player/ReconBot.glb";
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
