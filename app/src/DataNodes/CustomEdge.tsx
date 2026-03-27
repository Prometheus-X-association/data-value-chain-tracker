import React, { type FC } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import { FlowEdgeData } from './types';

const CustomEdge: FC<EdgeProps<Edge<FlowEdgeData>>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const isMostlyVertical = Math.abs(targetX - sourceX) < 120 && Math.abs(targetY - sourceY) > 180;
  const labelOffsetX = isMostlyVertical ? 188 : 0;
  const labelOffsetY = isMostlyVertical ? -8 : targetY > sourceY ? -26 : 26;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#8b5e18', strokeWidth: 1.6 }} />
      <EdgeLabelRenderer>
        <div
          className="edge-label-renderer__custom-edge nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX + labelOffsetX}px, ${labelY + labelOffsetY}px)`,
          }}
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
