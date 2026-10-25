export const UNDERLAG_MAX_BYTES = 8 * 1024 * 1024;

export const UNDERLAG_ACCEPT =
  "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";

export const UNDERLAG_MIME = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
} as const;

export type UnderlagMime =
  (typeof UNDERLAG_MIME)[keyof typeof UNDERLAG_MIME];

export function detectUnderlagMime(bytes: Uint8Array): UnderlagMime | null {
  if (bytes.length >= 5 && asciiPrefix(bytes, 5) === "%PDF-") {
    return UNDERLAG_MIME.pdf;
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return UNDERLAG_MIME.png;
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return UNDERLAG_MIME.jpeg;
  }
  return null;
}

export function validateUnderlagMeta(
  sizeBytes: number,
  fileName: string,
  reportedType: string
): string | null {
  if (sizeBytes <= 0) return "Filen är tom.";
  if (sizeBytes > UNDERLAG_MAX_BYTES) {
    return "Underlaget får vara högst 8 MB.";
  }
  const name = fileName.toLowerCase();
  const okType =
    reportedType === UNDERLAG_MIME.pdf ||
    reportedType === UNDERLAG_MIME.jpeg ||
    reportedType === UNDERLAG_MIME.png;
  const okExt =
    name.endsWith(".pdf") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png");
  if (!okType && !okExt) {
    return "Underlaget måste vara PDF, JPG eller PNG.";
  }
  return null;
}

function asciiPrefix(bytes: Uint8Array, length: number): string {
  return String.fromCharCode(...bytes.subarray(0, length));
}
