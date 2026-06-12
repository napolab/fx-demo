// Cover-fit math shared between the WGSL composite (screen→content) and the
// p5 overlay (content→screen). Keep both directions in one place so they
// cannot drift apart.

import type { CoverScale, Point } from '../types';

// Scale applied in the shader: contentUv = (screenUv - 0.5) * scale + 0.5.
export const coverScale = (contentAspect: number, viewportAspect: number): CoverScale =>
  viewportAspect > contentAspect ? { x: 1, y: contentAspect / viewportAspect } : { x: viewportAspect / contentAspect, y: 1 };

// Inverse mapping used by the overlay so vector data lands on the video.
export const contentToScreen = (point: Point, scale: CoverScale): Point => ({
  x: (point.x - 0.5) / scale.x + 0.5,
  y: (point.y - 0.5) / scale.y + 0.5,
});
