import React, { memo } from 'react';
import { getSmoothStepPath, EdgeProps } from '@xyflow/react';
import { useStore } from '../store/index.js';

export const AnimatedEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
    data,
  }: EdgeProps) => {
    const storeActive = useStore((s) => s.activeEdges.has(id));
    const isActive = data?._edgeActive === true || storeActive;

    // Get stepped/orthogonal path
    const [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    return (
      <>
        {/* Background static path */}
        <path
          id={id}
          style={{
            ...style,
            stroke: selected ? '#2563eb' : isActive ? '#f97316' : '#cbd5e1',
            strokeWidth: selected ? 3 : isActive ? 2.5 : 1.5,
            fill: 'none',
            strokeDasharray: '6 3',
            transition: 'stroke 0.2s, stroke-width 0.2s',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd}
        />

        {/* Foreground glowing animation overlay path */}
        {isActive && (
          <path
            style={{
              stroke: '#f97316',
              strokeWidth: 2,
              fill: 'none',
            }}
            className="animate-edge-glow"
            d={edgePath}
          />
        )}
      </>
    );
  },
);

AnimatedEdge.displayName = 'AnimatedEdge';

export const edgeTypes = {
  animated: AnimatedEdge,
};
