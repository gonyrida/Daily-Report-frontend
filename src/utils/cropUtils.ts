export async function exportCroppedImage(
  src: string,
  opts: {
    rotation: number; // degrees
    scale: number;
    offset: { x: number; y: number };
    viewport: { width: number; height: number };
    output: { width: number; height: number };
    fillWhite?: boolean;
  }
): Promise<string> {
  // Load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(e);
    i.src = src;
  });

  const { rotation, scale, offset, viewport, output, fillWhite = false } = opts;

  // Create an offscreen canvas large enough to render the transformed image
  // We'll render the image centered, apply rotation and scale, then sample the center viewport
  const tmpCanvas = document.createElement("canvas");
  // Use a canvas that's big enough to avoid clipping when rotating
  const diag = Math.ceil(Math.max(img.width, img.height) * scale * 2);
  tmpCanvas.width = diag;
  tmpCanvas.height = diag;
  const tctx = tmpCanvas.getContext("2d")!;

  // clear with transparent
  tctx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);

  // translate to center
  tctx.save();
  tctx.translate(tmpCanvas.width / 2 + offset.x, tmpCanvas.height / 2 + offset.y);
  tctx.rotate((rotation * Math.PI) / 180);
  tctx.scale(scale, scale);
  // draw image centered
  tctx.drawImage(img, -img.width / 2, -img.height / 2);
  tctx.restore();

  // Now compute the source rectangle in tmpCanvas corresponding to the viewport center
  const centerX = tmpCanvas.width / 2;
  const centerY = tmpCanvas.height / 2;
  const sx = Math.round(centerX - viewport.width / 2);
  const sy = Math.round(centerY - viewport.height / 2);
  const sw = viewport.width;
  const sh = viewport.height;

  // Create output canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = output.width;
  outCanvas.height = output.height;
  const octx = outCanvas.getContext("2d")!;

  if (fillWhite) {
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  } else {
    // leave transparent
    octx.clearRect(0, 0, outCanvas.width, outCanvas.height);
  }

  // Draw the sampled region scaled down/up to output size
  // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
  octx.drawImage(tmpCanvas, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);

  // Return PNG data URL
  return outCanvas.toDataURL("image/png");
}
