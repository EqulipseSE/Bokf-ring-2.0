import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function convertPdf(pdfPath: string, outDir: string): Promise<number> {
  const bytes = new Uint8Array(readFileSync(pdfPath));
  const scope = globalThis as typeof globalThis & {
    DOMMatrix?: typeof DOMMatrix;
    ImageData?: typeof ImageData;
    Path2D?: typeof Path2D;
  };
  scope.DOMMatrix ??= DOMMatrix;
  scope.ImageData ??= ImageData;
  scope.Path2D ??= Path2D;

  const doc = await getDocument({
    data: bytes.slice(),
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  const base = path.basename(pdfPath, path.extname(pdfPath));
  let written = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const context = canvas.getContext("2d");
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context,
      viewport,
    }).promise;
    const suffix = doc.numPages > 1 ? `-p${i}` : "";
    const outPath = path.join(outDir, `${base}${suffix}.jpg`);
    writeFileSync(outPath, canvas.toBuffer("image/jpeg", 90));
    written += 1;
  }

  await doc.destroy();
  return written;
}

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) throw new Error("Ange mapp med PDF-filer");
  const outDir = path.join(inputDir, "jpg");
  mkdirSync(outDir, { recursive: true });

  const pdfs = readdirSync(inputDir)
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .sort((a, b) => a.localeCompare(b, "sv"));

  let files = 0;
  let pages = 0;
  for (const name of pdfs) {
    const full = path.join(inputDir, name);
    try {
      const count = await convertPdf(full, outDir);
      files += 1;
      pages += count;
      console.log(`ok ${name} -> ${count} sida(or)`);
    } catch (error) {
      console.error(`fel ${name}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`klart: ${files} pdf, ${pages} jpg i ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
