import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type WheelEvent,
} from "react";

type Point = { x: number; y: number };

export function Viewport({
  children,
  zoom,
  onZoom,
  onDeselect,
}: PropsWithChildren<{
  zoom: number;
  onZoom: (zoom: number) => void;
  onDeselect: () => void;
}>) {
  const stage = useRef<HTMLDivElement>(null);
  const transform = useRef({ x: 0, y: 0, scale: zoom });
  const pointers = useRef(new Map<number, Point>());
  const lastTap = useRef(0);
  const start = useRef<
    | {
        point: Point;
        transform: typeof transform.current;
        distance?: number;
        midpoint?: Point;
      }
    | undefined
  >(undefined);
  const [, render] = useState(0);

  const clamp = (value: number) => Math.min(4, Math.max(0.25, value));

  const commit = (next: typeof transform.current) => {
    transform.current = next;
    if (stage.current) {
      stage.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
    }
  };

  useEffect(() => {
    commit({ ...transform.current, scale: zoom });
  }, [zoom]);

  const fit = () => {
    if (!stage.current) return;
    const parent = stage.current.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const docW = stage.current.offsetWidth;
    const docH = stage.current.offsetHeight;
    const scale = Math.min((w - 60) / docW, (h - 60) / docH, 1);
    const x = (w - docW * scale) / 2;
    const y = 30;
    commit({ x: x - (w - docW) / 2, y, scale });
    onZoom(scale);
  };

  const down = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest(".paper-block")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const now = Date.now();
    if (pointers.current.size === 1) {
      if (now - lastTap.current < 300) {
        fit();
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    }

    const points = [...pointers.current.values()];
    start.current = { point: points[0], transform: { ...transform.current } };
    if (points.length === 2) {
      start.current.distance = Math.hypot(
        points[1].x - points[0].x,
        points[1].y - points[0].y,
      );
      start.current.midpoint = {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      };
    }
    onDeselect();
  };

  const move = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId) || !start.current) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const points = [...pointers.current.values()];
    if (
      points.length === 2 &&
      start.current.distance &&
      start.current.midpoint
    ) {
      const distance = Math.hypot(
        points[1].x - points[0].x,
        points[1].y - points[0].y,
      );
      const midpoint = {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      };
      const scale = clamp(
        (start.current.transform.scale * distance) / start.current.distance,
      );
      commit({
        x: start.current.transform.x + midpoint.x - start.current.midpoint.x,
        y: start.current.transform.y + midpoint.y - start.current.midpoint.y,
        scale,
      });
      onZoom(scale);
    } else {
      commit({
        ...start.current.transform,
        x: start.current.transform.x + event.clientX - start.current.point.x,
        y: start.current.transform.y + event.clientY - start.current.point.y,
      });
    }
  };

  const up = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    start.current = undefined;
    render((v) => v + 1);
  };

  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const next = clamp(
        transform.current.scale * Math.exp(-event.deltaY * 0.006),
      );
      commit({ ...transform.current, scale: next });
      onZoom(next);
    } else {
      commit({
        ...transform.current,
        x: transform.current.x - event.deltaX,
        y: transform.current.y - event.deltaY,
      });
    }
  };

  return (
    <div
      className="viewport"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onWheel={wheel}
    >
      <div className="stage" ref={stage}>
        {children}
      </div>
    </div>
  );
}
