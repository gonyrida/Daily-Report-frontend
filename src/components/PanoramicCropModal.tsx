import React, { useEffect, useRef, useState } from "react";
import { exportCroppedImage } from "../utils/cropUtils";

interface Props {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
  // optional props could include initial rotation/scale
}

const VIEWPORT_WIDTH = 680; // px - preview width (keeps 2.68:1 ratio)
const VIEWPORT_HEIGHT = Math.round(VIEWPORT_WIDTH / 2.68);

const PanoramicCropModal: React.FC<Props> = ({ src, onCancel, onSave }) => {
  const [rotation, setRotation] = useState(0); // degrees
  const [scale, setScale] = useState(1);
  const [bgWhite, setBgWhite] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const offsetStart = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // reset on src change
    setRotation(0);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current || !offsetStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStart.current = null;
    offsetStart.current = null;
  };

  const handleSave = async () => {
    try {
      // Get the original image dimensions
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = (e) => reject(e);
        i.src = src;
      });

      // Calculate width to maintain original aspect ratio with fixed height
      const originalAspectRatio = img.width / img.height;
      const fixedHeight = 94;
      const calculatedWidth = Math.round(fixedHeight * originalAspectRatio);

      const result = await exportCroppedImage(src, {
        rotation,
        scale,
        offset,
        viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
        output: { 
          width: calculatedWidth,  // Dynamic based on original aspect ratio
          height: fixedHeight      // Fixed at 94
        },
        fillWhite: bgWhite,
      });
      onSave(result);
    } catch (err) {
      console.error(err);
      alert("Failed to export image");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
      aria-modal
    >
      <div
        style={{
          background: "#111",
          padding: 20,
          borderRadius: 8,
          maxWidth: Math.min(VIEWPORT_WIDTH + 240, 1100),
          width: "100%",
          color: "#fff",
          display: "flex",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              width: VIEWPORT_WIDTH,
              height: VIEWPORT_HEIGHT,
              position: "relative",
              background: bgWhite ? "#fff" : "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%)",
              overflow: "hidden",
              borderRadius: 6,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                ref={imgRef}
                src={src}
                alt="to crop"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
                  transformOrigin: "center center",
                  maxWidth: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Fixed cropping hole outline */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                pointerEvents: "none",
                border: "2px solid rgba(255,255,255,0.7)",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleRotate} className="btn">
              Rotate 90°
            </button>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Zoom
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </label>

            <button
              onClick={() => setBgWhite((v) => !v)}
              className="btn"
              title="Toggle background"
            >
              Background: {bgWhite ? "White" : "Checker"}
            </button>
          </div>
        </div>

        <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#ddd" }}>Preview / Controls</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="btn">
              -
            </button>
            <button onClick={() => setScale((s) => Math.min(3, s + 0.1))} className="btn">
              +
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save 252x94 PNG
            </button>
          </div>

          <div style={{ marginTop: 20, color: "#999", fontSize: 12 }}>
            Drag to position, use rotate and zoom. The visible area is locked to a 2.68:1 ratio.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanoramicCropModal;
