import { useRef, useState, type ChangeEvent } from "react";
import { Button, IconButton, Sheet } from "@/components/ui";
import { Check, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { uuid } from "@/lib/uuid";
import type { Asset } from "@/types/models";

interface Props {
  open: boolean;
  kind: "logo" | "signature" | "stamp" | "image";
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIM = 1200;

const PRESETS: Record<
  Props["kind"],
  { label: string; ratio: number | null }[]
> = {
  logo: [
    { label: "Free", ratio: null },
    { label: "1:1", ratio: 1 },
    { label: "3:1", ratio: 3 },
    { label: "4:1", ratio: 4 },
    { label: "16:9", ratio: 16 / 9 },
  ],
  signature: [
    { label: "Free", ratio: null },
    { label: "3:1", ratio: 3 },
    { label: "4:1", ratio: 4 },
  ],
  stamp: [
    { label: "Free", ratio: null },
    { label: "1:1", ratio: 1 },
  ],
  image: [
    { label: "Free", ratio: null },
    { label: "1:1", ratio: 1 },
    { label: "4:3", ratio: 4 / 3 },
    { label: "16:9", ratio: 16 / 9 },
  ],
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ImageImporter({ open, kind, onClose, onSave }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [ratio, setRatio] = useState<number | null>(null); // FREE by default
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    action: "move" | "resize" | null;
    startX: number;
    startY: number;
    startCrop: typeof crop;
  }>({ action: null, startX: 0, startY: 0, startCrop: crop });

  const reset = () => {
    setImgSrc(null);
    setImgDims({ w: 0, h: 0 });
    setCrop({ x: 0, y: 0, w: 0, h: 0 });
    setName("");
    setRatio(null);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      alert(
        `This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please use an image under 5 MB.`,
      );
      return;
    }

    setName(file.name.replace(/\.[^.]+$/, ""));
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = new Image();
    img.onload = () => {
      setImgSrc(dataUrl);
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      setCrop({
        x: 0,
        y: 0,
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.src = dataUrl;
  };

  const setPreset = (r: number | null) => {
    setRatio(r);
    if (!r || !imgDims.w) return;
    const targetW = Math.min(crop.w, imgDims.w);
    const targetH = targetW / r;
    if (targetH <= imgDims.h) {
      const y = Math.max(0, (imgDims.h - targetH) / 2);
      setCrop({ x: (imgDims.w - targetW) / 2, y, w: targetW, h: targetH });
    } else {
      const h = imgDims.h;
      const w = h * r;
      setCrop({ x: (imgDims.w - w) / 2, y: 0, w, h });
    }
  };

  const onPointerDown = (e: React.PointerEvent, action: "move" | "resize") => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      action,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.action) return;
    const el = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / el.width) * imgDims.w;
    const dy = ((e.clientY - dragRef.current.startY) / el.height) * imgDims.h;
    if (dragRef.current.action === "move") {
      const nx = clamp(dragRef.current.startCrop.x + dx, 0, imgDims.w - crop.w);
      const ny = clamp(dragRef.current.startCrop.y + dy, 0, imgDims.h - crop.h);
      setCrop({ ...crop, x: nx, y: ny });
    } else {
      const nw = clamp(
        dragRef.current.startCrop.w + dx,
        20,
        imgDims.w - crop.x,
      );
      const nh = ratio
        ? nw / ratio
        : clamp(dragRef.current.startCrop.h + dy, 20, imgDims.h - crop.y);
      setCrop({ ...crop, w: nw, h: nh });
    }
  };

  const onPointerUp = () => {
    dragRef.current.action = null;
  };

  const cropAndSave = async () => {
    if (!imgSrc) return;
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = imgSrc;
    });

    let finalW = Math.round(crop.w);
    let finalH = Math.round(crop.h);
    if (finalW > MAX_DIM || finalH > MAX_DIM) {
      const scale = MAX_DIM / Math.max(finalW, finalH);
      finalW = Math.round(finalW * scale);
      finalH = Math.round(finalH * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = finalW;
    canvas.height = finalH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, finalW, finalH);

    const dataUrl = canvas.toDataURL("image/png");
    const asset: Asset = {
      id: uuid(),
      kind,
      name: name || kind,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    };
    onSave(asset);
    reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Sheet open={open} title={`Add ${kind}`} onClose={close}>
      {!imgSrc ? (
        <div className="grid place-items-center gap-3 rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          <Upload />
          <p className="m-0">Choose an image from your device</p>
          <Button onClick={() => fileRef.current?.click()}>Choose file</Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            hidden
            onChange={handleFile}
          />
          <small className="text-[11px]">
            PNG, JPEG, SVG or WebP · max 5 MB · nothing leaves this device
          </small>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS[kind].map((p) => (
              <button
                key={p.label}
                className={
                  ratio === p.ratio
                    ? "rounded-md border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--primary)]"
                    : "rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)]"
                }
                onClick={() => setPreset(p.ratio)}
              >
                {p.label}
              </button>
            ))}
            <IconButton
              label="Reset crop"
              onClick={() => {
                setCrop({ x: 0, y: 0, w: imgDims.w, h: imgDims.h });
                setRatio(null);
              }}
            >
              <RotateCcw />
            </IconButton>
            <IconButton label="Remove image" onClick={reset}>
              <Trash2 />
            </IconButton>
          </div>
          <div
            className="relative touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img
              src={imgSrc}
              alt=""
              className="mx-auto block max-h-[320px] max-w-full"
              draggable={false}
            />
            <div
              className="absolute cursor-move border-2 border-[#3b82f6] bg-[#3b82f6]/10"
              style={{
                left: `${(crop.x / imgDims.w) * 100}%`,
                top: `${(crop.y / imgDims.h) * 100}%`,
                width: `${(crop.w / imgDims.w) * 100}%`,
                height: `${(crop.h / imgDims.h) * 100}%`,
              }}
              onPointerDown={(e) => onPointerDown(e, "move")}
            >
              <div
                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm bg-[#3b82f6]"
                onPointerDown={(e) => onPointerDown(e, "resize")}
              />
            </div>
          </div>
          <label className="mt-3 grid gap-1 text-xs font-semibold text-[var(--text-secondary)]">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text)]"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={cropAndSave}>
              <Check size={16} /> Save {kind}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
