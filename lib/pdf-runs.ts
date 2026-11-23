export type PdfRun = { x: number; y: number; line: number; text: string };

import { inflateRawSync, inflateSync } from "zlib";

function inflateStreams(bytes: Uint8Array): string[] {
  const raw = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const body = Buffer.from(match[1], "latin1");
    try {
      streams.push(inflateSync(body).toString("latin1"));
    } catch {
      try {
        streams.push(inflateRawSync(body).toString("latin1"));
      } catch {
        // Inte en flate-ström.
      }
    }
  }
  return streams;
}

function parseCmap(source: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const line of source.split(/\r?\n/)) {
    const single = line.match(/^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>$/);
    if (single) {
      map.set(parseInt(single[1], 16), String.fromCodePoint(parseInt(single[2], 16)));
      continue;
    }
    const range = line.match(/^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>$/);
    if (!range) continue;
    const from = parseInt(range[1], 16);
    const to = parseInt(range[2], 16);
    const start = parseInt(range[3], 16);
    for (let code = from; code <= to; code += 1) {
      map.set(code, String.fromCodePoint(start + (code - from)));
    }
  }
  return map;
}

function decodeHex(hex: string, map: Map<number, string>): string {
  let text = "";
  for (let index = 0; index + 4 <= hex.length; index += 4) {
    text += map.get(parseInt(hex.slice(index, index + 4), 16)) ?? "";
  }
  return text;
}

/** Textbitar med position, för PDF:er där texten ligger som CID och ToUnicode. */
export function extractPdfRuns(bytes: Uint8Array): PdfRun[] {
  const streams = inflateStreams(bytes);
  const maps = streams.filter((stream) => stream.includes("beginbfchar")).map(parseCmap);
  const content = streams.find((stream) => stream.includes("Tj"));
  if (!content || maps.length === 0) return [];

  const fontOrder: string[] = [];
  let map = maps[0];
  let x = 0;
  let y = 0;
  let line = 0;
  const runs: PdfRun[] = [];
  const tokens =
    /\/(F\d+)\s+[0-9.]+\s+Tf|([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+Tm|([0-9.-]+)\s+([0-9.-]+)\s+Td|<([0-9A-Fa-f]+)>\s+Tj/g;
  for (const token of content.matchAll(tokens)) {
    if (token[1]) {
      if (!fontOrder.includes(token[1])) fontOrder.push(token[1]);
      map = maps[fontOrder.indexOf(token[1])] ?? maps[0];
      continue;
    }
    if (token[2]) {
      x = Number(token[6]);
      y = Number(token[7]);
      line += 1;
      continue;
    }
    if (token[8]) {
      x += Number(token[8]);
      y += Number(token[9]);
      continue;
    }
    if (token[10]) {
      const text = decodeHex(token[10], map);
      if (text.trim()) runs.push({ x, y, line, text });
    }
  }
  return runs;
}
