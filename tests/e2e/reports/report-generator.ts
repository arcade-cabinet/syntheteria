/**
 * Playtest Report Generator — produces an HTML report from playtest results.
 *
 * Output includes:
 *   - Header with game seed, date, total turns, duration
 *   - Screenshot gallery (turns 1, 10, 25, 50, 75, 100)
 *   - Resource timeline chart (inline SVG)
 *   - Per-faction summary table (when faction data becomes available)
 *   - Error log
 *   - Turn event highlights (when TurnEventLog is wired)
 */

import * as path from "node:path";

// ─── Types (must match ai-playtest-100turns.spec.ts) ────────────────────────

interface TurnSnapshot {
	turnNumber: number;
	timestamp: number;
	resources: {
		scrapMetal: number;
		eWaste: number;
		intactComponents: number;
		ferrousScrap: number;
		alloyStock: number;
		polymerSalvage: number;
		conductorWire: number;
		electrolyte: number;
		siliconWafer: number;
		stormCharge: number;
		elCrystal: number;
	};
	unitCount: number;
	enemyCount: number;
	stormIntensity: number;
	activeScene: string;
	screenshotPath: string | null;
}

interface VictoryResult {
	winner: string;
	type: string;
	turnNumber: number;
}

interface PlaytestResults {
	seed: string;
	startTime: number;
	endTime: number;
	totalTurns: number;
	snapshots: TurnSnapshot[];
	errors: string[];
	turnEventLog: unknown[] | null;
	victoryResult: VictoryResult | null;
	campaignStats: Record<string, unknown> | null;
	crashed: boolean;
	crashMessage: string | null;
}

// ─── SVG Chart Generator ────────────────────────────────────────────────────

interface ChartSeries {
	label: string;
	color: string;
	values: { turn: number; value: number }[];
}

function generateSvgChart(
	series: ChartSeries[],
	width: number,
	height: number,
	title: string,
): string {
	const padding = { top: 30, right: 20, bottom: 40, left: 60 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Find data bounds
	let maxTurn = 1;
	let maxValue = 1;
	for (const s of series) {
		for (const point of s.values) {
			if (point.turn > maxTurn) maxTurn = point.turn;
			if (point.value > maxValue) maxValue = point.value;
		}
	}

	// Round up maxValue for nicer grid lines
	const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue || 1)));
	maxValue = Math.ceil(maxValue / magnitude) * magnitude || 10;

	const scaleX = (turn: number) => padding.left + (turn / maxTurn) * chartWidth;
	const scaleY = (value: number) =>
		padding.top + chartHeight - (value / maxValue) * chartHeight;

	let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#09131b;border-radius:8px;">`;

	// Title
	svg += `<text x="${width / 2}" y="20" text-anchor="middle" fill="#8be6ff" font-family="monospace" font-size="12" letter-spacing="2">${escapeHtml(title.toUpperCase())}</text>`;

	// Grid lines
	const gridLines = 5;
	for (let i = 0; i <= gridLines; i++) {
		const y = padding.top + (chartHeight * i) / gridLines;
		const value = Math.round(maxValue * (1 - i / gridLines));
		svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
		svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="rgba(255,255,255,0.4)" font-family="monospace" font-size="9">${value}</text>`;
	}

	// X-axis labels
	const xTicks = [1, 10, 25, 50, 75, 100].filter((t) => t <= maxTurn);
	for (const tick of xTicks) {
		const x = scaleX(tick);
		svg += `<text x="${x}" y="${height - 10}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="monospace" font-size="9">T${tick}</text>`;
		svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + chartHeight}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
	}

	// Plot each series
	for (const s of series) {
		if (s.values.length === 0) continue;

		const points = s.values
			.map((p) => `${scaleX(p.turn)},${scaleY(p.value)}`)
			.join(" ");

		svg += `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;

		// Data point dots
		for (const p of s.values) {
			svg += `<circle cx="${scaleX(p.turn)}" cy="${scaleY(p.value)}" r="3" fill="${s.color}"/>`;
		}
	}

	// Legend
	let legendX = padding.left;
	const legendY = height - 6;
	for (const s of series) {
		svg += `<rect x="${legendX}" y="${legendY - 8}" width="10" height="3" rx="1" fill="${s.color}"/>`;
		svg += `<text x="${legendX + 14}" y="${legendY - 3}" fill="rgba(255,255,255,0.6)" font-family="monospace" font-size="8">${escapeHtml(s.label)}</text>`;
		legendX += s.label.length * 6 + 30;
	}

	svg += "</svg>";
	return svg;
}

// ─── HTML Helpers ───────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function formatTimestamp(ms: number): string {
	return new Date(ms)
		.toISOString()
		.replace("T", " ")
		.replace(/\.\d+Z$/, " UTC");
}

// ─── Report Generator ───────────────────────────────────────────────────────

export function generatePlaytestReport(results: PlaytestResults): string {
	const duration = results.endTime - results.startTime;
	const statusColor = results.crashed
		? "#ff5050"
		: results.victoryResult
			? "#f6c56a"
			: "#7ee7cb";
	const statusLabel = results.crashed
		? "CRASHED"
		: results.victoryResult
			? `VICTORY — ${results.victoryResult.winner.toUpperCase()}`
			: "COMPLETED";

	// Build resource chart series from snapshots
	const resourceSeries: ChartSeries[] = [
		{
			label: "Scrap Metal",
			color: "#f6c56a",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.scrapMetal,
			})),
		},
		{
			label: "E-Waste",
			color: "#8be6ff",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.eWaste,
			})),
		},
		{
			label: "Components",
			color: "#7ee7cb",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.intactComponents,
			})),
		},
	];

	// Build unit count chart
	const unitSeries: ChartSeries[] = [
		{
			label: "Player Units",
			color: "#7ee7cb",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.unitCount,
			})),
		},
		{
			label: "Enemy Units",
			color: "#ff5050",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.enemyCount,
			})),
		},
	];

	// Build harvest materials chart
	const harvestSeries: ChartSeries[] = [
		{
			label: "Ferrous",
			color: "#c4a066",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.ferrousScrap,
			})),
		},
		{
			label: "Alloy",
			color: "#a0c4e8",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.alloyStock,
			})),
		},
		{
			label: "Polymer",
			color: "#e8a0d0",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.polymerSalvage,
			})),
		},
		{
			label: "Conductor",
			color: "#d4e870",
			values: results.snapshots.map((s) => ({
				turn: s.turnNumber,
				value: s.resources.conductorWire,
			})),
		},
	];

	// Screenshots section
	const screenshotSnapshots = results.snapshots.filter((s) => s.screenshotPath);

	let screenshotsHtml = "";
	if (screenshotSnapshots.length > 0) {
		screenshotsHtml = `
			<div class="section">
				<h2>SCREENSHOT GALLERY</h2>
				<div class="screenshot-grid">
					${screenshotSnapshots
						.map((s) => {
							const relativePath = path.basename(s.screenshotPath!);
							return `
							<div class="screenshot-card">
								<div class="screenshot-label">TURN ${s.turnNumber}</div>
								<img src="screenshots/${relativePath}" alt="Turn ${s.turnNumber}" />
								<div class="screenshot-stats">
									Units: ${s.unitCount} | Enemies: ${s.enemyCount} | Scrap: ${s.resources.scrapMetal}
								</div>
							</div>
						`;
						})
						.join("")}
				</div>
			</div>
		`;
	}

	// Error log section
	let errorsHtml = "";
	if (results.errors.length > 0) {
		errorsHtml = `
			<div class="section">
				<h2>ERROR LOG</h2>
				<div class="error-list">
					${results.errors
						.map((e) => `<div class="error-entry">${escapeHtml(e)}</div>`)
						.join("")}
				</div>
			</div>
		`;
	}

	// Turn event log section (when available)
	let eventLogHtml = "";
	if (results.turnEventLog && results.turnEventLog.length > 0) {
		eventLogHtml = `
			<div class="section">
				<h2>TURN EVENT HIGHLIGHTS</h2>
				<div class="event-log">
					<pre>${escapeHtml(JSON.stringify(results.turnEventLog.slice(0, 50), null, 2))}</pre>
				</div>
			</div>
		`;
	}

	// Final snapshot summary
	const finalSnapshot =
		results.snapshots.length > 0
			? results.snapshots[results.snapshots.length - 1]
			: null;

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Syntheteria Playtest Report — ${formatTimestamp(results.startTime)}</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }

		body {
			background: #030308;
			color: #e0f0f8;
			font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
			font-size: 13px;
			line-height: 1.6;
			padding: 24px;
		}

		.container {
			max-width: 1200px;
			margin: 0 auto;
		}

		.header {
			border: 1px solid rgba(139, 230, 255, 0.2);
			border-radius: 12px;
			background: rgba(7, 17, 23, 0.9);
			padding: 24px;
			margin-bottom: 24px;
		}

		.header h1 {
			font-size: 16px;
			letter-spacing: 4px;
			color: #8be6ff;
			text-transform: uppercase;
			margin-bottom: 16px;
		}

		.header-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 12px;
		}

		.header-stat {
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 8px;
			padding: 12px;
			background: rgba(0, 0, 0, 0.3);
		}

		.header-stat .label {
			font-size: 9px;
			letter-spacing: 2px;
			color: rgba(255, 255, 255, 0.5);
			text-transform: uppercase;
			margin-bottom: 4px;
		}

		.header-stat .value {
			font-size: 18px;
			font-weight: 700;
			letter-spacing: 1px;
		}

		.status-badge {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 4px;
			font-size: 10px;
			letter-spacing: 2px;
			font-weight: 700;
		}

		.section {
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 12px;
			background: rgba(7, 17, 23, 0.7);
			padding: 20px;
			margin-bottom: 20px;
		}

		.section h2 {
			font-size: 11px;
			letter-spacing: 3px;
			color: #8be6ff;
			text-transform: uppercase;
			margin-bottom: 16px;
			padding-bottom: 8px;
			border-bottom: 1px solid rgba(139, 230, 255, 0.1);
		}

		.chart-container {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
			gap: 16px;
		}

		.chart-card {
			border: 1px solid rgba(255, 255, 255, 0.06);
			border-radius: 8px;
			overflow: hidden;
		}

		.chart-card svg {
			width: 100%;
			height: auto;
		}

		.screenshot-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
			gap: 16px;
		}

		.screenshot-card {
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 8px;
			overflow: hidden;
			background: rgba(0, 0, 0, 0.3);
		}

		.screenshot-card img {
			width: 100%;
			height: auto;
			display: block;
		}

		.screenshot-label {
			padding: 8px 12px;
			font-size: 10px;
			letter-spacing: 2px;
			color: #8be6ff;
			background: rgba(7, 17, 23, 0.95);
			border-bottom: 1px solid rgba(139, 230, 255, 0.1);
		}

		.screenshot-stats {
			padding: 8px 12px;
			font-size: 10px;
			color: rgba(255, 255, 255, 0.5);
			background: rgba(7, 17, 23, 0.95);
			border-top: 1px solid rgba(255, 255, 255, 0.04);
		}

		.summary-table {
			width: 100%;
			border-collapse: collapse;
		}

		.summary-table th {
			text-align: left;
			font-size: 9px;
			letter-spacing: 2px;
			color: rgba(255, 255, 255, 0.5);
			text-transform: uppercase;
			padding: 8px 12px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}

		.summary-table td {
			padding: 8px 12px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.04);
			font-size: 12px;
		}

		.error-list {
			max-height: 300px;
			overflow-y: auto;
		}

		.error-entry {
			padding: 8px 12px;
			border-left: 3px solid #ff5050;
			margin-bottom: 4px;
			background: rgba(255, 80, 80, 0.05);
			font-size: 11px;
			color: #ffd7d7;
			word-break: break-all;
		}

		.event-log pre {
			background: rgba(0, 0, 0, 0.3);
			padding: 12px;
			border-radius: 6px;
			font-size: 10px;
			overflow-x: auto;
			max-height: 400px;
			overflow-y: auto;
			color: rgba(255, 255, 255, 0.7);
		}

		.footer {
			text-align: center;
			padding: 16px;
			font-size: 10px;
			color: rgba(255, 255, 255, 0.3);
			letter-spacing: 1px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Syntheteria Playtest Report</h1>
			<div class="header-grid">
				<div class="header-stat">
					<div class="label">Status</div>
					<div class="value">
						<span class="status-badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">
							${statusLabel}
						</span>
					</div>
				</div>
				<div class="header-stat">
					<div class="label">Turns Completed</div>
					<div class="value" style="color:#8be6ff">${results.totalTurns} / ${TOTAL_TURNS}</div>
				</div>
				<div class="header-stat">
					<div class="label">Duration</div>
					<div class="value" style="color:#d4b0ff">${formatDuration(duration)}</div>
				</div>
				<div class="header-stat">
					<div class="label">World Seed</div>
					<div class="value" style="color:#f6c56a;font-size:14px">${escapeHtml(results.seed)}</div>
				</div>
				<div class="header-stat">
					<div class="label">Date</div>
					<div class="value" style="color:rgba(255,255,255,0.7);font-size:12px">${formatTimestamp(results.startTime)}</div>
				</div>
				<div class="header-stat">
					<div class="label">Errors</div>
					<div class="value" style="color:${results.errors.length > 0 ? "#ff5050" : "#7ee7cb"}">${results.errors.length}</div>
				</div>
			</div>
		</div>

		${
			results.victoryResult
				? `
		<div class="section" style="border-color:rgba(246,197,106,0.3)">
			<h2 style="color:#f6c56a">VICTORY CONDITION</h2>
			<table class="summary-table">
				<tbody>
					<tr><td>Winner</td><td style="color:#f6c56a">${escapeHtml(results.victoryResult.winner)}</td></tr>
					<tr><td>Victory Type</td><td style="color:#8be6ff">${escapeHtml(results.victoryResult.type)}</td></tr>
					<tr><td>Turn Achieved</td><td style="color:#7ee7cb">${results.victoryResult.turnNumber}</td></tr>
				</tbody>
			</table>
		</div>
		`
				: ""
		}

		${
			results.campaignStats
				? `
		<div class="section">
			<h2>CAMPAIGN STATISTICS</h2>
			<table class="summary-table">
				<tbody>
					${Object.entries(results.campaignStats)
						.filter(([_, v]) => typeof v === "number" || typeof v === "string")
						.map(([key, value]) => {
							const label = key
								.replace(/([A-Z])/g, " $1")
								.replace(/^./, (s) => s.toUpperCase());
							return `<tr><td>${escapeHtml(label)}</td><td style="color:#8be6ff">${typeof value === "number" ? value : escapeHtml(String(value))}</td></tr>`;
						})
						.join("")}
				</tbody>
			</table>
		</div>
		`
				: ""
		}

		${
			finalSnapshot
				? `
		<div class="section">
			<h2>FINAL STATE — TURN ${finalSnapshot.turnNumber}</h2>
			<table class="summary-table">
				<thead>
					<tr>
						<th>Metric</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					<tr><td>Player Units</td><td style="color:#7ee7cb">${finalSnapshot.unitCount}</td></tr>
					<tr><td>Enemy Units</td><td style="color:#ff5050">${finalSnapshot.enemyCount}</td></tr>
					<tr><td>Scrap Metal</td><td style="color:#f6c56a">${finalSnapshot.resources.scrapMetal}</td></tr>
					<tr><td>E-Waste</td><td style="color:#8be6ff">${finalSnapshot.resources.eWaste}</td></tr>
					<tr><td>Intact Components</td><td style="color:#7ee7cb">${finalSnapshot.resources.intactComponents}</td></tr>
					<tr><td>Ferrous Scrap</td><td style="color:#c4a066">${finalSnapshot.resources.ferrousScrap}</td></tr>
					<tr><td>Alloy Stock</td><td style="color:#a0c4e8">${finalSnapshot.resources.alloyStock}</td></tr>
					<tr><td>Polymer Salvage</td><td style="color:#e8a0d0">${finalSnapshot.resources.polymerSalvage}</td></tr>
					<tr><td>Conductor Wire</td><td style="color:#d4e870">${finalSnapshot.resources.conductorWire}</td></tr>
					<tr><td>Electrolyte</td><td style="color:#70d4e8">${finalSnapshot.resources.electrolyte}</td></tr>
					<tr><td>Silicon Wafer</td><td style="color:#b0a0e8">${finalSnapshot.resources.siliconWafer}</td></tr>
					<tr><td>Storm Charge</td><td style="color:#e8e070">${finalSnapshot.resources.stormCharge}</td></tr>
					<tr><td>EL Crystal</td><td style="color:#e070e8">${finalSnapshot.resources.elCrystal}</td></tr>
					<tr><td>Storm Intensity</td><td style="color:#ffd7d7">${(finalSnapshot.stormIntensity * 100).toFixed(1)}%</td></tr>
				</tbody>
			</table>
		</div>
		`
				: ""
		}

		<div class="section">
			<h2>RESOURCE TIMELINE</h2>
			<div class="chart-container">
				<div class="chart-card">
					${generateSvgChart(resourceSeries, 520, 260, "Core Resources")}
				</div>
				<div class="chart-card">
					${generateSvgChart(unitSeries, 520, 260, "Unit Count")}
				</div>
				<div class="chart-card">
					${generateSvgChart(harvestSeries, 520, 260, "Harvest Materials")}
				</div>
			</div>
		</div>

		${screenshotsHtml}
		${errorsHtml}
		${eventLogHtml}

		${
			results.crashed
				? `
		<div class="section" style="border-color:rgba(255,80,80,0.3)">
			<h2 style="color:#ff5050">CRASH REPORT</h2>
			<div class="error-entry" style="font-size:14px">
				${escapeHtml(results.crashMessage || "Unknown crash")}
			</div>
			<p style="margin-top:12px;color:rgba(255,255,255,0.5)">
				The game crashed at turn ${results.totalTurns}. Check the error log above for details.
			</p>
		</div>
		`
				: ""
		}

		<div class="footer">
			SYNTHETERIA AUTOMATED PLAYTEST &middot; GENERATED ${formatTimestamp(Date.now())}
		</div>
	</div>
</body>
</html>`;
}

const TOTAL_TURNS = 100;
