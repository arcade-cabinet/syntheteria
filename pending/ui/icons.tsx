import React from "react";

interface IconProps {
	width?: number | string;
	height?: number | string;
	color?: string;
	className?: string;
	style?: React.CSSProperties;
}

function iconStroke(props: IconProps) {
	return props.color || "currentColor";
}

function defaultSize(props: IconProps) {
	return {
		width: props.width ?? 24,
		height: props.height ?? 24,
	};
}

export function ReactIcon(props: IconProps) {
	return (
		<svg
			viewBox="-11.5 -10.23174 23 20.46348"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<circle cx="0" cy="0" r="2.05" fill={iconStroke(props)} />
			<g stroke={iconStroke(props)} strokeWidth="1" fill="none">
				<ellipse rx="11" ry="4.2" />
				<ellipse rx="11" ry="4.2" transform="rotate(60)" />
				<ellipse rx="11" ry="4.2" transform="rotate(120)" />
			</g>
		</svg>
	);
}

export function ExpoIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 256 231"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M121 85c2-3 5-4 7-4 1 0 5 1 7 4 16 22 43 67 63 101l26 40c7 8 18 3 24-6s8-15 8-22c0-4-88-168-97-182-9-13-11-16-26-16h-11c-14 0-16 3-25 16C88 30 0 194 0 198c0 7 2 13 8 22s17 14 24 6l26-40c20-34 47-79 63-101Z"
				fill={iconStroke(props)}
			/>
		</svg>
	);
}

export function DrizzleIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<rect
				width="9.631"
				height="40.852"
				fill={iconStroke(props)}
				rx="4.816"
				transform="matrix(.87303 .48767 -.49721 .86763 43.48 67.304)"
			/>
			<rect
				width="9.631"
				height="40.852"
				fill={iconStroke(props)}
				rx="4.816"
				transform="matrix(.87303 .48767 -.49721 .86763 76.94 46.534)"
			/>
			<rect
				width="9.631"
				height="40.852"
				fill={iconStroke(props)}
				rx="4.816"
				transform="matrix(.87303 .48767 -.49721 .86763 128.424 46.535)"
			/>
			<rect
				width="9.631"
				height="40.852"
				fill={iconStroke(props)}
				rx="4.816"
				transform="matrix(.87303 .48767 -.49721 .86763 94.957 67.304)"
			/>
		</svg>
	);
}

export function TSIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 256 256"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M20 0h216c11.046 0 20 8.954 20 20v216c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20V20C0 8.954 8.954 0 20 0Z"
				fill={iconStroke(props)}
			/>
			<path
				d="M150.518 200.475v27.62c4.492 2.302 9.805 4.028 15.938 5.179 6.133 1.151 12.597 1.726 19.393 1.726 6.622 0 12.914-.633 18.874-1.899 5.96-1.266 11.187-3.352 15.678-6.257 4.492-2.906 8.048-6.704 10.669-11.394 2.62-4.689 3.93-10.486 3.93-17.391 0-5.006-.749-9.394-2.246-13.163a30.748 30.748 0 0 0-6.479-10.055c-2.821-2.935-6.205-5.567-10.149-7.898-3.945-2.33-8.394-4.531-13.347-6.602-3.628-1.497-6.881-2.949-9.761-4.359-2.879-1.41-5.327-2.848-7.342-4.316-2.016-1.467-3.571-3.021-4.665-4.661-1.094-1.64-1.641-3.495-1.641-5.567 0-1.899.489-3.61 1.468-5.135s2.362-2.834 4.147-3.927c1.785-1.094 3.973-1.942 6.565-2.547 2.591-.604 5.471-.906 8.638-.906 2.304 0 4.737.173 7.299.518 2.563.345 5.14.877 7.732 1.597a53.669 53.669 0 0 1 7.558 2.719 41.7 41.7 0 0 1 6.781 3.797v-25.807c-4.204-1.611-8.797-2.805-13.778-3.582-4.981-.777-10.697-1.165-17.147-1.165-6.565 0-12.784.705-18.658 2.115-5.874 1.409-11.043 3.61-15.506 6.602-4.463 2.993-7.99 6.805-10.582 11.437-2.591 4.632-3.887 10.17-3.887 16.615 0 8.228 2.375 15.248 7.127 21.06 4.751 5.811 11.963 10.731 21.638 14.759a291.458 291.458 0 0 1 10.625 4.575c3.283 1.496 6.119 3.049 8.509 4.66 2.39 1.611 4.276 3.366 5.658 5.265 1.382 1.899 2.073 4.057 2.073 6.474a9.901 9.901 0 0 1-1.296 4.963c-.863 1.524-2.174 2.848-3.93 3.97-1.756 1.122-3.945 1.999-6.565 2.632-2.62.633-5.687.95-9.2.95-5.989 0-11.92-1.05-17.794-3.151-5.875-2.1-11.317-5.25-16.327-9.451Zm-46.036-68.733H140V109H41v22.742h35.345V233h28.137V131.742Z"
				fill="#000"
			/>
		</svg>
	);
}

export function DroneIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M7 10.5 4 7.5M17 10.5l3-3M8 15h8M9 6h6l2 4v5l-2 3H9l-2-3v-5l2-4Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="12" cy="13" r="1.4" fill={iconStroke(props)} />
		</svg>
	);
}

export function FactoryIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M3 20V9l5 3V9l5 3V6l8 4v10H3Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path d="M8 20v-4h3v4" stroke={iconStroke(props)} strokeWidth="1.8" />
		</svg>
	);
}

export function StormIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M8.5 17.5h7a4.5 4.5 0 0 0 .8-8.93A5.5 5.5 0 0 0 6.17 9.6 3.9 3.9 0 0 0 8.5 17.5Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="m12.5 11.5-2 3h2l-1 4 3-4h-2l2-3h-2Z" fill={iconStroke(props)} />
		</svg>
	);
}

export function BoltIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z" fill={iconStroke(props)} />
		</svg>
	);
}

export function PlayIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path d="M8 6v12l10-6-10-6Z" fill={iconStroke(props)} />
		</svg>
	);
}

export function PauseIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<rect x="6" y="5" width="4" height="14" fill={iconStroke(props)} />
			<rect x="14" y="5" width="4" height="14" fill={iconStroke(props)} />
		</svg>
	);
}

export function MapIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2V6Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path d="M8 4v14M16 6v14" stroke={iconStroke(props)} strokeWidth="1.8" />
		</svg>
	);
}

export function WrenchIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M14.5 6.5a4 4 0 0 0-5.64 5.64L4 17v3h3l4.86-4.86A4 4 0 0 0 17.5 9l-2 1-2-2 1-1.5Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function AlertIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M12 3 2.5 20h19L12 3Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="M12 9v4.5M12 17h.01"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function RadarIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<circle
				cx="12"
				cy="12"
				r="8"
				stroke={iconStroke(props)}
				strokeWidth="1.6"
			/>
			<circle
				cx="12"
				cy="12"
				r="4"
				stroke={iconStroke(props)}
				strokeWidth="1.6"
			/>
			<path
				d="M12 12 17.5 8.5"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<circle cx="17.5" cy="8.5" r="1.2" fill={iconStroke(props)} />
		</svg>
	);
}

// ─── Unit Role Icons ─────────────────────────────────────────────────────────

export function EyeIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<circle
				cx="12"
				cy="12"
				r="3"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
			/>
		</svg>
	);
}

export function SwordIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M14.5 3.5 20 2l-1.5 5.5-3 3L10 16l-2.5-.5L7 13l5.5-5.5 2-4Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="m4 20 3-3M7 17l3 3M4 20l3 3"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function HammerIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M6 15 15 6l3 3-9 9-3-3Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="M15 6l2-2 4 4-2 2"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path d="M3 21l3-6 3 3-6 3Z" fill={iconStroke(props)} />
		</svg>
	);
}

export function ShieldIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M12 3 4 7v5c0 4.4 3.5 8.5 8 10 4.5-1.5 8-5.6 8-10V7l-8-4Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function BoxIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="M12 22V12M12 12 3 7M12 12l9-5"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
			/>
		</svg>
	);
}

export function MenuIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M4 6h16M4 12h16M4 18h16"
				stroke={iconStroke(props)}
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function ChevronRightIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="M9 6l6 6-6 6"
				stroke={iconStroke(props)}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function ShardIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			{...defaultSize(props)}
			className={props.className}
			style={props.style}
		>
			<path
				d="m12 3 7 5-3 11H8L5 8l7-5Z"
				stroke={iconStroke(props)}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path d="M12 3v16" stroke={iconStroke(props)} strokeWidth="1.8" />
		</svg>
	);
}
