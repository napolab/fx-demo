// Ramer–Douglas–Peucker polyline simplification. Treats the input as an open
// polyline anchored at both ends — good enough for closed contours visually,
// since marching-squares rings start/end on a real boundary point.

import type { Point } from '../../types';

const perpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  const cross = Math.abs(dx * (lineStart.y - point.y) - dy * (lineStart.x - point.x));
  return cross / Math.sqrt(lengthSquared);
};

const simplifySegment = (points: readonly Point[], epsilon: number): readonly Point[] => {
  if (points.length <= 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return points;

  const farthest = points.slice(1, -1).reduce(
    (best, point, index) => {
      const distance = perpendicularDistance(point, first, last);
      return distance > best.distance ? { distance, index: index + 1 } : best;
    },
    { distance: 0, index: 0 },
  );

  if (farthest.distance <= epsilon) return [first, last];
  const head = simplifySegment(points.slice(0, farthest.index + 1), epsilon);
  const tail = simplifySegment(points.slice(farthest.index), epsilon);
  return [...head.slice(0, -1), ...tail];
};

export const simplify = (points: readonly Point[], epsilon: number): readonly Point[] => simplifySegment(points, epsilon);
