import "server-only";

import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

function worker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("swe+eng").catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/** Läser text i ett foto. Tom sträng om läsningen misslyckas. */
export async function textFromImage(bytes: Uint8Array): Promise<string> {
  try {
    const result = await (await worker()).recognize(Buffer.from(bytes));
    return result.data.text ?? "";
  } catch {
    return "";
  }
}

/**
 * Ritar första sidan av en PDF som saknar textlager och läser den.
 * Används när fakturan är en bild, till exempel exporterad från Google Docs.
 */
export async function textFromPdfPage(bytes: Uint8Array): Promise<string> {
  try {
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
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: context, viewport }).promise;
    const png = canvas.toBuffer("image/png");
    await doc.destroy();
    return textFromImage(png);
  } catch {
    return "";
  }
}
