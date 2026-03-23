/**
 * Stub for react-native-svg in Vite/CT builds.
 * Maps RN-SVG elements to standard HTML SVG elements so icons render in DOM.
 */
import React from "react";

export type SvgProps = React.SVGProps<SVGSVGElement> & {
	width?: number | string;
	height?: number | string;
	color?: string;
};

function Svg({ children, ...props }: SvgProps) {
	return React.createElement("svg", props, children);
}

export default Svg;
export const Circle = "circle";
export const Defs = "defs";
export const Ellipse = "ellipse";
export const G = "g";
export const LinearGradient = "linearGradient";
export const Path = "path";
export const Rect = "rect";
export const Stop = "stop";
