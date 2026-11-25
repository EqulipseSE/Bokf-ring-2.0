import { mkdirSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { createWorker } from "tesseract.js";

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) throw new Error("Ange mapp med JPG");
  const outDir = path.join(inputDir, "ocr");
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(inputDir)
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "sv"));

  const worker = await createWorker("swe+eng");
  const summary: { file: string; text: string }[] = [];
  try {
    for (const name of files) {
      const full = path.join(inputDir, name);
      process.stdout.write(`ocr ${name}... `);
      const result = await worker.recognize(full);
      const text = (result.data.text ?? "").trim();
      writeFileSync(path.join(outDir, `${name}.txt`), text, "utf8");
      summary.push({ file: name, text });
      console.log(`${text.length} tecken`);
    }
  } finally {
    await worker.terminate();
  }

  writeFileSync(
    path.join(outDir, "_all.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log(`klart: ${summary.length} filer -> ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
