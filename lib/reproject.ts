import * as d3 from "d3";

/**
 * Reprojects the NASA Black Marble equirectangular image onto the target canvas
 * using the provided D3 projection. Runs in async chunks so it never blocks the UI.
 */
export async function reprojectBlackMarble(
  canvas: HTMLCanvasElement,
  projection: d3.GeoProjection,
  onProgress?: (pct: number) => void
): Promise<void> {
  // Load source image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = "/black-marble.jpg";
  });

  // Decode source to raw pixels
  const srcC = document.createElement("canvas");
  srcC.width  = img.naturalWidth;   // 3600
  srcC.height = img.naturalHeight;  // 1800
  const srcCtx = srcC.getContext("2d")!;
  srcCtx.drawImage(img, 0, 0);
  const src = srcCtx.getImageData(0, 0, srcC.width, srcC.height);
  const srcW = src.width;
  const srcH = src.height;
  const srcData = src.data;

  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(W, H);
  const outData = out.data;

  // Process in row-chunks so the browser stays responsive
  const CHUNK = 40;
  const totalChunks = Math.ceil(H / CHUNK);

  for (let chunk = 0; chunk < totalChunks; chunk++) {
    // Yield to the browser between chunks
    await new Promise<void>((r) => setTimeout(r, 0));

    const y0 = chunk * CHUNK;
    const y1 = Math.min(y0 + CHUNK, H);

    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        const coords = projection.invert!([x, y]);
        if (!coords) continue;

        const lon = coords[0];
        const lat = coords[1];
        if (!isFinite(lon) || !isFinite(lat)) continue;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) continue;

        // Equirectangular → pixel in source
        const sx = Math.min(srcW - 1, Math.max(0, Math.floor((lon + 180) / 360 * srcW)));
        const sy = Math.min(srcH - 1, Math.max(0, Math.floor((90 - lat)  / 180 * srcH)));

        const si = (sy * srcW + sx) * 4;
        const di = (y  * W   + x)  * 4;

        outData[di]     = srcData[si];
        outData[di + 1] = srcData[si + 1];
        outData[di + 2] = srcData[si + 2];
        outData[di + 3] = 255;
      }
    }

    // Paint progress incrementally so user sees it build up
    ctx.putImageData(out, 0, 0);
    onProgress?.(Math.round(((chunk + 1) / totalChunks) * 100));
  }
}
