import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const exercises = JSON.parse(
  fs.readFileSync(path.join(root, "public/data/exercises.json"), "utf8"),
);

const index = exercises.map((e) => ({
  id: e.id,
  name: e.name,
  level: e.level,
  equipment: e.equipment,
  category: e.category,
  primaryMuscles: e.primaryMuscles,
  secondaryMuscles: e.secondaryMuscles,
  images: e.images?.slice(0, 1) ?? [],
}));

const facets = {
  levels: [...new Set(exercises.map((e) => e.level).filter(Boolean))].sort(),
  equipment: [
    ...new Set(exercises.map((e) => e.equipment).filter(Boolean)),
  ].sort(),
  categories: [
    ...new Set(exercises.map((e) => e.category).filter(Boolean)),
  ].sort(),
  primaryMuscles: [
    ...new Set(exercises.flatMap((e) => e.primaryMuscles || [])),
  ].sort(),
};

fs.writeFileSync(
  path.join(root, "public/data/exercises-index.json"),
  JSON.stringify({ exercises: index, facets }),
);

console.log(`Indexed ${index.length} exercises`);
