import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import { pushTurnEvent } from "../ui/game/turnEvents";
import type { RobotClass } from "../robots/types";
import type { ResourceMaterial } from "../terrain/types";
import {
	ResourceDeposit,
	UnitFaction,
	UnitHarvest,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../traits";
import { awardXP, recordHarvest } from "./experienceSystem";
import { trackIncome } from "./resourceDeltaSystem";
import { addResources } from "./resourceSystem";
import { triggerHarvestSpeech } from "./speechTriggers";

/** Process one tick of all active harvest operations. */
export function harvestSystem(world: World): void {
	for (const unit of world.query(UnitHarvest, UnitFaction)) {
		const harvest = unit.get(UnitHarvest);
		if (!harvest) continue;

		const remaining = harvest.ticksRemaining - 1;

		if (remaining > 0) {
			unit.set(UnitHarvest, { ...harvest, ticksRemaining: remaining });
			continue;
		}

		// Harvest complete — play SFX and find the deposit to yield resources
		playSfx("harvest_complete");
		const faction = unit.get(UnitFaction);
		if (!faction) {
			unit.remove(UnitHarvest);
			continue;
		}

		for (const dep of world.query(ResourceDeposit)) {
			if (dep.id() !== harvest.depositEntityId) continue;

			const deposit = dep.get(ResourceDeposit);
			if (!deposit || deposit.depleted) break;

			// Yield 2-5 units of the deposit's material
			const yieldAmount = 2 + Math.floor(Math.random() * 4);
			addResources(
				world,
				faction.factionId,
				deposit.material as ResourceMaterial,
				yieldAmount,
			);
			trackIncome(deposit.material as ResourceMaterial, yieldAmount);
			pushTurnEvent(
				`Harvest complete: +${yieldAmount} ${deposit.material.replace(/_/g, " ")}`,
			);

			// Trigger harvest speech for the unit
			triggerHarvestSpeech(world, unit.id(), faction.factionId);

			// Award XP and harvest credit to the harvesting unit
			if (unit.has(UnitXP)) {
				recordHarvest(world, unit.id());
				const unitVisual = unit.get(UnitVisual);
				if (unitVisual?.modelId) {
					awardXP(
						world,
						unit.id(),
						unitVisual.modelId as RobotClass,
						"harvest",
					);
				}
			}

			// Decrease deposit amount
			const newAmount = deposit.amount - yieldAmount;
			if (newAmount <= 0) {
				dep.set(ResourceDeposit, {
					...deposit,
					amount: 0,
					depleted: true,
				});
			} else {
				dep.set(ResourceDeposit, { ...deposit, amount: newAmount });
			}
			break;
		}

		unit.remove(UnitHarvest);
	}
}

/** Start a harvest operation on a deposit. Returns true on success. */
export function startHarvest(
	world: World,
	unitEntityId: number,
	depositEntityId: number,
): boolean {
	// Find the unit
	let unitEntity = null;
	for (const e of world.query(UnitStats, UnitFaction)) {
		if (e.id() === unitEntityId) {
			unitEntity = e;
			break;
		}
	}
	if (!unitEntity) return false;

	// Check unit has AP
	const stats = unitEntity.get(UnitStats);
	if (!stats || stats.ap < 1) return false;

	// Check unit not already harvesting
	if (unitEntity.has(UnitHarvest)) return false;

	// Find the deposit
	let depositEntity = null;
	for (const e of world.query(ResourceDeposit)) {
		if (e.id() === depositEntityId) {
			depositEntity = e;
			break;
		}
	}
	if (!depositEntity) return false;

	const deposit = depositEntity.get(ResourceDeposit);
	if (!deposit || deposit.depleted) return false;

	// Deduct AP
	unitEntity.set(UnitStats, { ...stats, ap: stats.ap - 1 });

	// Add UnitHarvest trait
	unitEntity.add(
		UnitHarvest({
			depositEntityId,
			ticksRemaining: 3,
			totalTicks: 3,
			targetX: deposit.tileX,
			targetZ: deposit.tileZ,
		}),
	);

	return true;
}
