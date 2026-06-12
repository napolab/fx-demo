// Shared mesh point primitives. No DOM, no GPU — fully unit-tested.

export type Point = {
  x: number;
  y: number;
};

// Fixed anchors so the Delaunay mesh always covers the full frame: 4 corners plus
// `perEdge` evenly spaced points along each edge. These stay undisplaced.
export const makeBorderPoints = (perEdge: number): Point[] => {
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const edges = Array.from({ length: perEdge }, (_, index) => (index + 1) / (perEdge + 1)).flatMap((t): Point[] => [
    { x: t, y: 0 },
    { x: t, y: 1 },
    { x: 0, y: t },
    { x: 1, y: t },
  ]);

  return [...corners, ...edges];
};
