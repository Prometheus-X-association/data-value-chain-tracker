import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import { FlowNodeData } from './types';

export const DataNodeCard = memo(({ data }: NodeProps<Node<FlowNodeData>>) => {
  return (
    <div className="data-node-card">
      <Handle className="data-node-card__handle" position={Position.Top} type="target" />

      <div className="data-node-card__header">
        <span className="data-node-card__eyebrow">{data.nodeType}</span>
        <span className="data-node-card__badges">
          {data.participantShare || data.incentiveTotal ? (
            <span className="data-node-card__badge">{data.participantShare || data.incentiveTotal} pts</span>
          ) : null}
          {data.executionCount > 1 ? (
            <span className="data-node-card__badge" title="Times this step was executed">×{data.executionCount}</span>
          ) : null}
        </span>
      </div>

      <strong className="data-node-card__title">{data.label}</strong>
      <p className="data-node-card__subtitle">{data.subtitle}</p>

      <dl className="data-node-card__meta">
        {!data.isRoot ? (
          <div>
            <dt>From</dt>
            <dd>{data.providerId}</dd>
          </div>
        ) : null}
        {data.consumerIds.length > 0 ? (
          <div>
            <dt>Sends to</dt>
            <dd>{data.consumerIds.join(', ')}</dd>
          </div>
        ) : null}
      </dl>

      <Handle className="data-node-card__handle" position={Position.Bottom} type="source" />
    </div>
  );
});

DataNodeCard.displayName = 'DataNodeCard';
