"use client";

type UnderlagPreviewProps = {
  src: string;
  mimeType: string;
  fileName: string;
};

export function UnderlagPreview({
  src,
  mimeType,
  fileName,
}: UnderlagPreviewProps) {
  if (mimeType === "application/pdf") {
    return (
      <iframe
        title={fileName}
        src={src}
        className="h-full min-h-[28rem] w-full bg-neutral-100"
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
