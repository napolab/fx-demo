// Pure layout math for PolyTrace. No DOM, no GPU — fully unit-tested.

export type CoverRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Cover-fit a source of the given aspect ratio onto the canvas: scale until the
// canvas is fully covered, centre the overflow (like CSS object-fit: cover).
export const coverRect = (canvasWidth: number, canvasHeight: number, sourceAspect: number): CoverRect => {
  if (sourceAspect <= 0) return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };

  const canvasAspect = canvasWidth / canvasHeight;
  if (sourceAspect > canvasAspect) {
    const width = canvasHeight * sourceAspect;

    return { x: (canvasWidth - width) / 2, y: 0, width, height: canvasHeight };
  }

  const height = canvasWidth / sourceAspect;

  return { x: 0, y: (canvasHeight - height) / 2, width: canvasWidth, height };
};
