const fs = require("node:fs");
const path = require("node:path");

const srcDir = path.join(__dirname, "src");

function getAllFiles(dirPath, arrayOfFiles) {
	const files = fs.readdirSync(dirPath);
	arrayOfFiles = arrayOfFiles || [];
	files.forEach((file) => {
		if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
			arrayOfFiles = getAllFiles(`${dirPath}/${file}`, arrayOfFiles);
		} else {
			if (file.endsWith(".ts") || file.endsWith(".tsx")) {
				arrayOfFiles.push(path.join(dirPath, "/", file));
			}
		}
	});
	return arrayOfFiles;
}

const files = getAllFiles(srcDir);

for (const filePath of files) {
	let content = fs.readFileSync(filePath, "utf-8");
	let changed = false;

	// Fix types imports that should come from traits.ts now
	if (
		(content.includes("Entity") && !content.includes("import")) ||
		(content.includes("Entity") &&
			!content.match(
				/import.*(?:Entity|UnitEntity|BuildingEntity).*from "\.\.?\/(?:ecs\/)?traits"/,
			))
	) {
		// Wait, it's easier to just inject the types at the top if they are missing
		if (!content.includes("import type { Entity")) {
			content = content.replace(
				/import type \{ Entity \} from "\.\.?\/ecs\/types";/,
				"",
			);
			content = `import type { Entity, UnitEntity, BuildingEntity } from "${path
				.relative(path.dirname(filePath), path.join(srcDir, "ecs", "traits"))
				.replace(/\\/g, "/")
				.replace(/^\.\.\/\.\./, "..")
				.replace(/^\.\//, "")}";\n${content}`;
			changed = true;
		}
	}

	// Fix factory.ts missing imports
	if (filePath.endsWith("factory.ts")) {
		content = `import { Identity, WorldPosition, MapFragment, Unit, Navigation, Building, LightningRod } from "./traits";\n${content}`;
		content = content.replace(/import type { Entity.*traits";\n/, "");
		content = `import type { Entity, UnitEntity, BuildingEntity } from "./traits";\n${content}`;
		changed = true;
	}

	if (filePath.endsWith("enemies.ts")) {
		content = content.replace(/import type { Entity.*traits";\n/, "");
		content = `import type { Entity, UnitEntity } from "../ecs/traits";\n${content}`;
		changed = true;
	}

	if (changed) {
		fs.writeFileSync(filePath, content);
	}
}
