"use client";

type UnderlagPreviewProps = {
  src: string;
  mimeType: string;
  fileName: string;
  /** Hög nog för en hel A4, plus läsarens verktygsrad. */
  fullPage?: boolean;
  /** Liten ruta, till exempel på leverantörsfakturans kort. */
  compact?: boolean;
};

export function UnderlagPreview({
  src,
  mimeType,
  fileName,
  fullPage = false,
  compact = false,
}: UnderlagPreviewProps) {
  if (mimeType === "application/pdf") {
    return (
      <iframe
        title={fileName}
        src={src}
        className={
          fullPage
            ? "h-[calc(100cqw*1.414+3.5rem)] w-full bg-neutral-100"
            : compact
              ? "h-[40rem] w-full bg-neutral-100"
              : "h-full min-h-[28rem] w-full bg-neutral-100"
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-[28rem] items-start justify-center overflow-auto bg-neutral-100 p-3">
      {/* Lokal blob eller autentiserad same-origin-URL */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={fileName} className="max-h-full max-w-full object-contain" />
    </div>
  );
}
