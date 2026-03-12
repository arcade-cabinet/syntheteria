import ArachnoidModel from "../../assets/models/Arachnoid.glb";
import CompanionBotModel from "../../assets/models/Companion-bot.glb";
import FieldFighterModel from "../../assets/models/FieldFighter.glb";
import Mecha01Model from "../../assets/models/Mecha01.glb";
import MechaGolemModel from "../../assets/models/MechaGolem.glb";
import MechaTrooperModel from "../../assets/models/MechaTrooper.glb";
import MobileStorageBotModel from "../../assets/models/MobileStorageBot.glb";
import QuadrupedTankModel from "../../assets/models/QuadrupedTank.glb";
import ReconBotModel from "../../assets/models/ReconBot.glb";
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
