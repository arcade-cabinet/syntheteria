/**
 * CutawayClipPlane — applies the dollhouse cutaway clipping plane to the renderer.
 *
 * Must be placed inside the R3F Canvas. Reads the cutaway plane from
 * cutawayStore and applies it as a global clipping plane each frame.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { getCutawayPlane } from "../../camera/cutawayStore";

export function CutawayClipPlane() {
	const gl = useThree((s) => s.gl);

	// Enable local clipping on mount, disable on unmount
	useEffect(() => {
		gl.localClippingEnabled = true;
		return () => {
			gl.localClippingEnabled = false;
			gl.clippingPlanes = [];
		};
	}, [gl]);

	// Apply the clipping plane each frame (plane constant updated by camera)
	useFrame(() => {
		const plane = getCutawayPlane();
		gl.clippingPlanes = [plane];
	});

	return null;
}
