// HUD string formatting for the tracking overlay. Pure: blob in, label out.

import type { TrackedBlob } from '../../types';

export const formatBlobLabel = (blob: TrackedBlob): string => {
  const id = `${blob.id}`.padStart(2, '0');
  return `blob_${id} x:${blob.cx.toFixed(3)} y:${blob.cy.toFixed(3)} a:${blob.area.toFixed(3)}`;
};

export const formatStatsLine = (blobCount: number, vertexCount: number): string => `tracking: ${blobCount} blobs / ${vertexCount} verts`;
