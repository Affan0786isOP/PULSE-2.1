const regex = /(?:import(?:type)?|export)\s+.*?(?:from\s+)?["'](\.[^"']+)["']|import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;
const str = `import("./foo"); import type { Foo } from "./bar";`;
let match;
while ((match = regex.exec(str)) !== null) {
  console.log(match[1] || match[2]);
}
