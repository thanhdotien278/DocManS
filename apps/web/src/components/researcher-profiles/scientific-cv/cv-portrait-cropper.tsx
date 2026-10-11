"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";

const FRAME_WIDTH = 240;
const FRAME_HEIGHT = 320;
const OUTPUT_WIDTH = 300;
const OUTPUT_HEIGHT = 400;

type Offset = { x: number; y: number };

type CvPortraitCropperProps = { file: File; onApply: (dataUrl: string) => void; onCancel: () => void };

// Lets the researcher pan/zoom an uploaded photo inside a fixed 3:4 frame and exports a 300x400 JPEG data URL.
export function CvPortraitCropper({ file, onApply, onCancel }: CvPortraitCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const drag = useRef<{ pointerX: number; pointerY: number; start: Offset } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => {
      const scale = Math.max(FRAME_WIDTH / next.naturalWidth, FRAME_HEIGHT / next.naturalHeight);
      setOffset({ x: (FRAME_WIDTH - next.naturalWidth * scale) / 2, y: (FRAME_HEIGHT - next.naturalHeight * scale) / 2 });
      setImage(next);
    };
    next.onerror = () => setLoadError("Không đọc được ảnh. Vui lòng chọn ảnh khác.");
    next.src = url;
    return () => { next.onload = next.onerror = null; URL.revokeObjectURL(url); };
  }, [file]);

  const scale = image ? Math.max(FRAME_WIDTH / image.naturalWidth, FRAME_HEIGHT / image.naturalHeight) * zoom : 1;
  const width = image ? image.naturalWidth * scale : 0;
  const height = image ? image.naturalHeight * scale : 0;

  // Keeps the frame fully covered by the image.
  function clamp(next: Offset, w = width, h = height): Offset {
    return { x: Math.min(0, Math.max(FRAME_WIDTH - w, next.x)), y: Math.min(0, Math.max(FRAME_HEIGHT - h, next.y)) };
  }

  function changeZoom(value: number) {
    if (!image) return;
    const base = Math.max(FRAME_WIDTH / image.naturalWidth, FRAME_HEIGHT / image.naturalHeight);
    const nextWidth = image.naturalWidth * base * value;
    const nextHeight = image.naturalHeight * base * value;
    // Zoom around the frame centre.
    const centerX = (FRAME_WIDTH / 2 - offset.x) / width;
    const centerY = (FRAME_HEIGHT / 2 - offset.y) / height;
    setZoom(value);
    setOffset(clamp({ x: FRAME_WIDTH / 2 - centerX * nextWidth, y: FRAME_HEIGHT / 2 - centerY * nextHeight }, nextWidth, nextHeight));
  }

  function apply() {
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = OUTPUT_WIDTH / FRAME_WIDTH;
    context.fillStyle = "#fff"; // transparent PNG areas would otherwise turn black in JPEG
    context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    context.drawImage(image, offset.x * ratio, offset.y * ratio, width * ratio, height * ratio);
    onApply(canvas.toDataURL("image/jpeg", 0.85));
  }

  return <Dialog label="Cắt ảnh chân dung 3x4" className="form-dialog cv-cropper-dialog" onClose={onCancel}>
    <div className="section-card">
      <h3>Cắt ảnh chân dung (3x4)</h3>
      {loadError ? <p className="state-message error" role="alert">{loadError}</p> : null}
      <div className="cv-cropper-frame" style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }} tabIndex={0} role="group" aria-label="Khung cắt ảnh 3x4. Dùng phím mũi tên để di chuyển ảnh."
        onKeyDown={(event) => {
          const step = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
          if (!step || !image) return;
          event.preventDefault();
          setOffset(clamp({ x: offset.x + step[0], y: offset.y + step[1] }));
        }}
        onPointerDown={(event) => { if (!image) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointerX: event.clientX, pointerY: event.clientY, start: offset }; }}
        onPointerMove={(event) => { const current = drag.current; if (current) setOffset(clamp({ x: current.start.x + event.clientX - current.pointerX, y: current.start.y + event.clientY - current.pointerY })); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}>
        {image ? <img src={image.src} alt="Ảnh đang cắt" draggable={false} style={{ width, height, transform: `translate(${offset.x}px, ${offset.y}px)` }} /> : <span role="status">{loadError ? "" : "Đang tải ảnh…"}</span>}
      </div>
      <small className="field-hint">Kéo ảnh để chọn vị trí, dùng thanh trượt để phóng to.</small>
      <label className="field" htmlFor="cv-cropper-zoom"><span>Phóng to</span><input id="cv-cropper-zoom" type="range" min={1} max={3} step={0.01} value={zoom} disabled={!image} onChange={(event) => changeZoom(Number(event.target.value))} /></label>
      <div className="button-row">
        <button type="button" className="button primary" disabled={!image} onClick={apply}>Áp dụng</button>
        <button type="button" className="button" onClick={onCancel}>Hủy</button>
      </div>
    </div>
  </Dialog>;
}
