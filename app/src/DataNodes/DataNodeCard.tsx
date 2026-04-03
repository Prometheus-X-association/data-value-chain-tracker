import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import { FlowNodeData } from './types';

export const DataNodeCard = memo(({ data }: NodeProps<Node<FlowNodeData>>) => {
  return (
    <div className="data-node-card">
      <Handle className="data-node-card__handle" position={Position.Top} type="target" />

      <div className="data-node-card__header">
        <span className="data-node-card__eyebrow">{data.nodeType}</span>
        <span className="data-node-card__badge">{data.participantShare || data.incentiveTotal} pts</span>
      </div>

      <strong className="data-node-card__title">{data.label}</strong>
      <p className="data-node-card__subtitle">{data.subtitle}</p>

      {!data.isRoot ? (
        <dl className="data-node-card__meta">
          <div>
            <dt>Provider</dt>
            <dd>{data.providerId}</dd>
          </div>
          {data.consumerIds.length > 0 ? (
            <div>
              <dt>Consumers</dt>
              <dd>
                <ul className="data-node-card__consumer-list">
                  {data.consumerIds.map((consumerId) => (
                    <li key={consumerId}>{consumerId}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <Handle className="data-node-card__handle" position={Position.Bottom} type="source" />
    </div>
  );
});

DataNodeCard.displayName = 'DataNodeCard';
