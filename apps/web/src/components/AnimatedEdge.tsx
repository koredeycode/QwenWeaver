import React, { memo } from 'react';
import { getSmoothStepPath, EdgeProps } from '@xyflow/react';
import { useStore } from '../store/index.js';

export const AnimatedEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  // Check if this specific edge is active/transferring data in store
  const isActive = useStore((s) => s.activeEdges.has(id));

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
          stroke: isActive ? '#ea580c' : '#cbd5e1', // Glow vs normal outline
          strokeWidth: isActive ? 2.5 : 1.5,
          transition: 'stroke 0.3s, stroke-width 0.3s',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Foreground glowing animation overlay path */}
      {isActive && (
        <path
          style={{
            stroke: '#ea580c', // primary orange
            strokeWidth: 2,
            fill: 'none',
          }}
          className="animate-edge-glow"
          d={edgePath}
        />
      )}
    </>
  );
});

AnimatedEdge.displayName = 'AnimatedEdge';

export const edgeTypes = {
  animated: AnimatedEdge,
};
