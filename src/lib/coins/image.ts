// Library photos are kept at up to 1600px on the long side at high JPEG
// quality (was 768px / 0.76 — visibly soft). The identify API rejects
// image strings over 1.6MB, so step quality down only if needed.
export async function fileToDataUrl(file: File, max = 1600, quality = 0.88): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read this image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  let q = quality;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > 1_500_000 && q > 0.6) {
    q = Math.max(0.6, q - 0.08);
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url;
}
