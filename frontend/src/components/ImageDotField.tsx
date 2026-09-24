import { useEffect, useRef } from 'react';
import motionUrl from '../assets/gpt-image-dots.bin?url';

// Dot radii sampled from the supplied reference: 12 × 11 spatial samples,
// 16 frames/second, 20 seconds. No video pixels, interface text or progress UI.
export default function ImageDotField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const context = canvas.getContext('2d');
    if (!context) return;
    const controller = new AbortController();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let samples: Uint8Array | undefined;
    let frame = 0;
    let visible = false;
    let last = 0;
    let elapsed = 0;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    const sample = (time: number, x: number, y: number) => {
      if (!samples) return .6;
      const f = Math.min(319, time * 16), a = Math.floor(f), b = Math.min(319, a + 1);
      const ix = Math.min(10, Math.floor(x)), iy = Math.min(9, Math.floor(y));
      const dx = x - ix, dy = y - iy;
      const at = (index: number) => {
        const offset = index * 132 + iy * 12 + ix;
        return (samples![offset]! * (1 - dx) * (1 - dy) + samples![offset + 1]! * dx * (1 - dy) + samples![offset + 12]! * (1 - dx) * dy + samples![offset + 13]! * dx * dy) / 64;
      };
      return at(a) * (1 - f + a) + at(b) * (f - a);
    };
    const draw = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      // Preserve the former centered cover composition, but draw vectors directly
      // into the full-resolution backing store instead of stretching a bitmap.
      const scale = Math.max(width, height) / 340;
      context.setTransform(scale * dpr, 0, 0, scale * dpr,
        (width - 340 * scale) / 2 * dpr, (height - 340 * scale) / 2 * dpr);
      context.fillStyle = '#82dfb8';
      for (let row = 0; row < 34; row++) for (let col = 0; col < 34; col++) {
        const x = col / 3, y = row / 33 * 10;
        let radius = sample(time, x, y);
        // Crossfade the final second into the first frame for a quiet loop seam.
        if (time > 19) radius = radius * (20 - time) + sample(0, x, y) * (time - 19);
        context.beginPath();
        context.arc(5 + col * 10, 5 + row * 10, Math.max(.15, radius * .75), 0, Math.PI * 2);
        context.fill();
      }
    };
    const tick = (now: number) => {
      if (last && now - last < 30) { frame = requestAnimationFrame(tick); return; }
      if (last) elapsed += Math.min(now - last, 100);
      last = now;
      draw((elapsed / 1000) % 20);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); last = 0;
      if (!samples) return;
      if (reduced.matches) draw(4);
      else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync(); });
    observer.observe(canvas);
    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      if (samples) draw(reduced.matches ? 4 : (elapsed / 1000) % 20);
    });
    resize.observe(canvas);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    fetch(motionUrl, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Dot motion asset unavailable');
      return response.arrayBuffer();
    }).then(buffer => {
      samples = new Uint8Array(buffer);
      if (samples.length !== 42240) throw new Error('Invalid dot motion asset');
      draw(0); sync();
    }).catch(error => { if (!controller.signal.aborted) console.error('Decorative dot animation:', error); });
    return () => { controller.abort(); observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, []);
  return <canvas ref={ref} className="image-dot-field" aria-hidden="true" />;
}
