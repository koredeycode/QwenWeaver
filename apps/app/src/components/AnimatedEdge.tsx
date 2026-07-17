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
    markerStart,
    selected,
    data,
    label,
  }: EdgeProps) => {
    const storeActive = useStore((s) => s.activeEdges.has(id));
    const selectedEdgeId = useStore((s) => s.selectedEdgeId);
    const isActive = data?._edgeActive === true || storeActive;
    const edgeData = data as any;
    const isConversation = edgeData?.subscription?.conversationMode === true;
    const maxRounds = edgeData?.subscription?.maxRounds ?? 5;
    const isEdgeSelected = selectedEdgeId === id;

    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const strokeColor = isEdgeSelected
      ? '#2563eb'
      : selected
        ? '#2563eb'
        : isActive
          ? '#f97316'
          : isConversation
            ? '#7c3aed'
            : '#cbd5e1';

    return (
      <>
        <path
          id={id}
          style={{
            ...style,
            stroke: strokeColor,
            strokeWidth: isEdgeSelected ? 3 : selected ? 3 : isActive ? 2.5 : 1.5,
            fill: 'none',
            strokeDasharray: isConversation ? undefined : '6 3',
            transition: 'stroke 0.2s, stroke-width 0.2s',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={isConversation ? 'url(#arrowhead-conversation)' : markerEnd}
          markerStart={isConversation ? 'url(#arrowhead-conversation)' : markerStart}
        />

        {isConversation && (
          <foreignObject
            width={120}
            height={22}
            x={labelX - 60}
            y={labelY - 11}
            className="overflow-visible"
            requiredExtensions="http://www.w3.org/1999/xhtml"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-purple-100 text-purple-700 border border-purple-300 whitespace-nowrap select-none">
                {maxRounds} R
              </span>
            </div>
          </foreignObject>
        )}

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
