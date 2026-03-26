/**
 * Debug overlay — visible only in development mode.
 *
 * Shows: error log, FPS, entity count, active system count.
 * Positioned bottom-left, semi-transparent, non-interactive by default.
 */

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	clearErrorLog,
	type ErrorLogEntry,
	getErrorLog,
	subscribeErrors,
} from "../../errors";

// Only render in dev mode
const IS_DEV = import.meta.env.DEV;

function useFps(): number {
	const [fps, setFps] = useState(0);
	const frames = useRef(0);
	const lastTime = useRef(performance.now());

	useEffect(() => {
		if (!IS_DEV) return;

		let raf: number;
		const tick = () => {
			frames.current++;
			const now = performance.now();
			if (now - lastTime.current >= 1000) {
				setFps(frames.current);
				frames.current = 0;
				lastTime.current = now;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);

	return fps;
}

function useErrorLog(): readonly ErrorLogEntry[] {
	return useSyncExternalStore(subscribeErrors, getErrorLog);
}

function ErrorList({ errors }: { errors: readonly ErrorLogEntry[] }) {
	if (errors.length === 0) return null;

	return (
		<div style={{ marginTop: 4, maxHeight: 160, overflowY: "auto" }}>
			{errors
				.slice(-10)
				.reverse()
				.map((entry) => (
					<div
						key={`${entry.timestamp}-${entry.message}`}
						style={{
							color: "#ff4444",
							fontSize: 10,
							lineHeight: "14px",
							borderBottom: "1px solid rgba(255,68,68,0.2)",
							padding: "2px 0",
							wordBreak: "break-word",
						}}
					>
						<span style={{ color: "#ff8888" }}>[{entry.system}]</span>{" "}
						{entry.message}
						{entry.entityId && (
							<span style={{ color: "#888" }}> (entity: {entry.entityId})</span>
						)}
					</div>
				))}
		</div>
	);
}

export function DebugOverlay() {
	const [visible, setVisible] = useState(false);
	const fps = useFps();
	const errors = useErrorLog();
	const snapshot = useSyncExternalStore(subscribe, getSnapshot);
	const [collapsed, setCollapsed] = useState(false);

	const toggle = useCallback(() => setCollapsed((c) => !c), []);

	// Toggle with F12 or backtick key
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "F12" || e.key === "`") {
				e.preventDefault();
				setVisible((v) => !v);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	if (!IS_DEV || !visible) return null;

	const entityCount = snapshot.unitCount + snapshot.enemyCount;

	return (
		<div
			style={{
				position: "fixed",
				bottom: 8,
				left: 8,
				background: "rgba(0,0,0,0.75)",
				color: "#0f0",
				fontFamily: "monospace",
				fontSize: 11,
				padding: "6px 10px",
				borderRadius: 4,
				zIndex: 9999,
				pointerEvents: "auto",
				minWidth: 180,
				maxWidth: 320,
				userSelect: "none",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span>
					FPS: {fps} | Entities: {entityCount} | Tick: {snapshot.tick}
				</span>
				<button
					type="button"
					onClick={toggle}
					style={{
						background: "none",
						border: "none",
						color: "#0f0",
						cursor: "pointer",
						fontSize: 11,
						padding: "0 4px",
					}}
				>
					{collapsed ? "+" : "-"}
				</button>
			</div>

			{!collapsed && (
				<>
					<div style={{ color: "#aaa", fontSize: 10, marginTop: 4 }}>
						Speed: {snapshot.gameSpeed}x {snapshot.paused ? "(PAUSED)" : ""} |
						Power: {snapshot.power.totalGeneration}/{snapshot.power.totalDemand}
					</div>
					{errors.length > 0 && (
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginTop: 4,
							}}
						>
							<span style={{ color: "#ff4444" }}>Errors: {errors.length}</span>
							<button
								type="button"
								onClick={clearErrorLog}
								style={{
									background: "none",
									border: "1px solid #ff4444",
									color: "#ff4444",
									cursor: "pointer",
									fontSize: 9,
									padding: "1px 4px",
									borderRadius: 2,
								}}
							>
								Clear
							</button>
						</div>
					)}
					<ErrorList errors={errors} />
				</>
			)}
		</div>
	);
}
