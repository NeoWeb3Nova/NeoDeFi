import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const files = ["ERC20.json", "ETFFaucet.json", "ETFMining.json", "ETFQuoter.json", "ETFTrading.json"];
const roots = [
  resolve("contracts", "abi"),
  resolve("frontend", "abi_json"),
  resolve("frontend", "src", "abis"),
];

const normalize = (value) => JSON.stringify(JSON.parse(value));
const failures = [];

for (const file of files) {
  const copies = await Promise.all(
    roots.map(async (root) => normalize(await readFile(resolve(root, file), "utf8"))),
  );

  if (!copies.every((copy) => copy === copies[0])) {
    failures.push(file);
  }
}

if (failures.length > 0) {
  console.error(`ABI copies are out of sync: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`ABI copies are synchronized (${files.length} files).`);
}
