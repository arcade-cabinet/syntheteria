/**
 * SynthesizerPanel — recipe selection and conversion for Synthesizer buildings.
 */

import type { World } from "koota";
import { useMemo, useState } from "react";
import {
	FUSION_RECIPES,
	type FusionRecipe,
	queueSynthesis,
	SynthesisQueue,
} from "../../../systems";
import { Building } from "../../../traits";
import type { GenericBuildingPanelProps } from "./GenericBuildingPanel";
import { headerStyle, upgradeBarStyle } from "./GenericBuildingPanel";

export function SynthesizerPanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingTier } = buildingData;
	const [feedback, setFeedback] = useState<string | null>(null);

	const currentQueue = useMemo(() => {
		for (const e of world.query(Building, SynthesisQueue)) {
			if (e.id() === entityId) {
				const q = e.get(SynthesisQueue);
				return q;
			}
		}
		return null;
	}, [world, entityId]);

	const recipes = useMemo(() => {
		return FUSION_RECIPES.filter((_r, i) => {
			if (buildingTier >= 3) return true;
			if (buildingTier >= 2) return i < 8;
			return i < 5;
		});
	}, [buildingTier]);

	function handleQueue(recipe: FusionRecipe) {
		const ok = queueSynthesis(world, entityId, recipe.id);
		if (ok) {
			setFeedback(`Queued: ${recipe.label}`);
			setTimeout(() => setFeedback(null), 1500);
		} else {
			setFeedback("Failed: insufficient resources or busy");
			setTimeout(() => setFeedback(null), 2500);
		}
	}

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>Synthesizer — Tier {buildingTier}</h3>

			{currentQueue && (
				<div style={upgradeBarStyle}>
					Conversion in progress — {currentQueue.ticksRemaining ?? 0} turns
					remaining
				</div>
			)}

			<div
				style={{
					marginTop: 10,
					fontSize: 10,
					color: "rgba(255,255,255,0.45)",
					textTransform: "uppercase",
					letterSpacing: "0.2em",
					marginBottom: 8,
				}}
			>
				Available Recipes
			</div>

			{recipes.map((recipe) => (
				<button
					key={recipe.id}
					type="button"
					onClick={() => handleQueue(recipe)}
					style={{
						width: "100%",
						textAlign: "left",
						padding: "8px 10px",
						marginBottom: 6,
						borderRadius: 6,
						border: "1px solid rgba(255,255,255,0.08)",
						background: "rgba(255,255,255,0.02)",
						cursor: "pointer",
						fontFamily: "inherit",
					}}
				>
					<div style={{ fontSize: 11, color: "#8be6ff" }}>{recipe.label}</div>
					<div
						style={{
							fontSize: 8,
							color: "rgba(255,255,255,0.35)",
							marginTop: 2,
						}}
					>
						{Object.entries(recipe.inputs)
							.map(([m, a]) => `${m.replace(/_/g, " ")} ×${a}`)
							.join(", ")}
						{" → "}
						{Object.entries(recipe.outputs)
							.map(([m, a]) => `${m.replace(/_/g, " ")} ×${a}`)
							.join(", ")}
					</div>
				</button>
			))}

			{feedback && (
				<div
					style={{
						marginTop: 8,
						padding: "6px 10px",
						borderRadius: 4,
						fontSize: 9,
						background: feedback.startsWith("Failed")
							? "rgba(204,68,68,0.08)"
							: "rgba(126,231,203,0.08)",
						border: feedback.startsWith("Failed")
							? "1px solid rgba(204,68,68,0.3)"
							: "1px solid rgba(126,231,203,0.3)",
						color: feedback.startsWith("Failed") ? "#cc6666" : "#7ee7cb",
					}}
				>
					{feedback}
				</div>
			)}
		</div>
	);
}
