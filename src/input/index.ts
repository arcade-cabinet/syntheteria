/**
 * @package input
 *
 * Board interaction — click, drag, and selection on the sphere world.
 */

export { BoardInput } from "./BoardInput";
export type { PathPoint } from "./pathPreview";
export {
	clearPreviewPath,
	getPathVersion,
	getPreviewPath,
	setPreviewPath,
	subscribePathState,
} from "./pathPreview";
