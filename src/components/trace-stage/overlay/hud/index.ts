// HUD string formatting for the tracking overlay. Pure: box in, label out.

import type { PartBox } from '../../types';

export const formatPartLabel = (box: PartBox): string => `${box.part} x:${box.cx.toFixed(3)} y:${box.cy.toFixed(3)}`;

export const formatStatsLine = (partCount: number, vertexCount: number): string => `tracking: ${partCount} parts / ${vertexCount} verts`;
