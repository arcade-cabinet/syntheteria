import argparse
import json
import math
import os
from pathlib import Path

import bpy
import mathutils


def parse_args():
    argv = []
    if "--" in os.sys.argv:
        argv = os.sys.argv[os.sys.argv.index("--") + 1 :]
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--preview-root", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--repo-root", required=True)
    return parser.parse_args(argv)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    supported_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in supported_engines else "BLENDER_EEVEE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
    world = bpy.data.worlds.new("CityInventoryWorld")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs[0].default_value = (0.02, 0.04, 0.06, 1.0)
        background.inputs[1].default_value = 0.45
    scene.world = world

    camera_data = bpy.data.cameras.new(name="InventoryCamera")
    camera = bpy.data.objects.new("InventoryCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    key_light = bpy.data.lights.new(name="KeyLight", type="SUN")
    key_light.energy = 3.2
    key_obj = bpy.data.objects.new("KeyLight", key_light)
    key_obj.rotation_euler = (math.radians(40), 0, math.radians(35))
    scene.collection.objects.link(key_obj)

    fill_light = bpy.data.lights.new(name="FillLight", type="AREA")
    fill_light.energy = 2500
    fill_light.shape = "DISK"
    fill_obj = bpy.data.objects.new("FillLight", fill_light)
    fill_obj.location = (-4.5, -4.0, 5.0)
    fill_obj.rotation_euler = (math.radians(70), 0, math.radians(-40))
    scene.collection.objects.link(fill_obj)

    return scene, camera


def imported_mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def compute_world_bounds(objects):
    bounds = []
    for obj in objects:
        for corner in obj.bound_box:
            bounds.append(obj.matrix_world @ mathutils.Vector(corner))
    if not bounds:
        zero = mathutils.Vector((0.0, 0.0, 0.0))
        return zero, zero
    min_v = mathutils.Vector(
        (min(v.x for v in bounds), min(v.y for v in bounds), min(v.z for v in bounds))
    )
    max_v = mathutils.Vector(
        (max(v.x for v in bounds), max(v.y for v in bounds), max(v.z for v in bounds))
    )
    return min_v, max_v


def center_objects(objects):
    min_v, max_v = compute_world_bounds(objects)
    center = (min_v + max_v) / 2
    for obj in objects:
        obj.location -= center
    bpy.context.view_layer.update()
    return compute_world_bounds(objects)


def frame_camera(camera, min_v, max_v):
    center = (min_v + max_v) / 2
    dimensions = max_v - min_v
    radius = max(dimensions.x, dimensions.y, dimensions.z, 0.5)
    distance = radius * 2.8
    camera.location = mathutils.Vector((distance, -distance * 0.9, radius * 1.55))
    direction = center - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_preview(scene, relative_path, preview_root):
    preview_path = Path(preview_root) / Path(relative_path).with_suffix(".png")
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(preview_path)
    bpy.ops.render.render(write_still=True)
    return preview_path


def process_glb(source_root, relative_path, preview_root, repo_root):
    scene, camera = reset_scene()
    absolute_path = Path(source_root) / relative_path
    bpy.ops.import_scene.gltf(filepath=str(absolute_path))
    meshes = imported_mesh_objects()
    objects = [obj for obj in bpy.context.scene.objects if obj.type in {"MESH", "EMPTY"}]
    mesh_names = [mesh.name for mesh in meshes]
    material_names = sorted(
        {
            slot.material.name
            for mesh in meshes
            for slot in mesh.material_slots
            if slot.material is not None
        }
    )
    min_v, max_v = center_objects(meshes if meshes else objects)
    frame_camera(camera, min_v, max_v)
    preview_path = render_preview(scene, relative_path, preview_root)
    dimensions = max_v - min_v
    return {
        "relativePath": relative_path.as_posix(),
        "previewRelativePath": preview_path.relative_to(Path(repo_root)).as_posix(),
        "meshCount": len(meshes),
        "objectCount": len(objects),
        "materials": material_names,
        "meshNames": mesh_names,
        "bounds": {
            "width": round(float(dimensions.x), 4),
            "depth": round(float(dimensions.y), 4),
            "height": round(float(dimensions.z), 4),
        },
    }


def main():
    args = parse_args()
    source_root = Path(args.source_root)
    preview_root = Path(args.preview_root)
    output_json = Path(args.output_json)
    repo_root = Path(args.repo_root)
    output_json.parent.mkdir(parents=True, exist_ok=True)

    models = []
    for path in sorted(source_root.rglob("*.glb")):
        relative_path = path.relative_to(source_root)
        models.append(process_glb(source_root, relative_path, preview_root, repo_root))

    output_json.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "generatedAt": bpy.app.version_string,
                "modelCount": len(models),
                "models": models,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
