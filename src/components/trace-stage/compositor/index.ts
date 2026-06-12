// Offscreen 2D compositor that stacks the trace stage's two render layers —
// the WebGPU video canvas (base) and the p5 overlay canvas (wireframe / HUD /
// face mask) — into one canvas. The recorder captures THIS canvas so the saved
// WebM carries the full composite, not just one layer. Only driven while
// recording, so idle frames pay nothing.

export type Compositor = {
  // The composite canvas; hand this to the recorder's captureStream.
  canvas: HTMLCanvasElement;
  // Stack base then overlay for the current frame. Auto-syncs the composite
  // size to the base backing store (both layers share css×dpr dimensions).
  composite: (base: HTMLCanvasElement, overlay: HTMLCanvasElement | undefined) => void;
};

export const createCompositor = (): Compositor => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  return {
    canvas,
    composite(base, overlay) {
      if (ctx === null) return;
      const surface = canvas;
      if (surface.width !== base.width || surface.height !== base.height) {
        surface.width = Math.max(base.width, 1);
        surface.height = Math.max(base.height, 1);
      }
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.drawImage(base, 0, 0, surface.width, surface.height);
      if (overlay !== undefined) ctx.drawImage(overlay, 0, 0, surface.width, surface.height);
    },
  };
};
