/**
 * ECS world instance.
 * Systems use world.query() inline with trait imports.
 */
import { createWorld } from "koota";

export const world = createWorld();
