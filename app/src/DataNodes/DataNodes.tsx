import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react';
import axios from 'axios';
import '@xyflow/react/dist/style.css';

import './DataNodes.css';
import CustomEdge from './CustomEdge';
import { DataNodeCard } from './DataNodeCard';
import { ApiNode, FlowEdgeData, FlowNodeData, Incentive, TreeApiNode } from './types';

const apiUrl = (path: string) => path;

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

const nodeTypes: NodeTypes = {
  dataNode: DataNodeCard,
};

const getNodes = async () => {
  const response = await axios.get<ApiNode[]>(apiUrl('/api/data'));
  return response.data;
};

const getNodesTree = async (nodeId: string) => {
  const response = await axios.get<TreeApiNode>(apiUrl(`/api/node-tree/${nodeId}`));
  return response.data;
};

const getIncentiveTotal = (incentives: Incentive[] = []) =>
  incentives.reduce((sum, incentive) => sum + (incentive.numPoints || 0), 0);

const truncateMiddle = (value: string, maxLength = 46) => {
  if (value.length <= maxLength) {
    return value;
  }

  const leading = Math.ceil((maxLength - 1) / 2);
  const trailing = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
};

const formatReference = (value?: string | null, maxLength = 42) => {
  if (!value) {
    return 'N/A';
  }

  try {
    const parsedUrl = new URL(value);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const tail = segments.slice(-2).join('/');

    if (tail) {
      return truncateMiddle(`${parsedUrl.hostname}/${tail}`, maxLength);
    }
  } catch (error) {
    // Fall back to generic truncation for non-URL values.
  }

  return truncateMiddle(value, maxLength);
};

const getInspectorHeading = (node: ApiNode) =>
  formatReference(
    node.participantId ||
      node.dataId ||
      node.usecaseContractTitle ||
      node.nodeMetadata.usecaseContractId ||
      node.nodeMetadata.dvctId ||
      node.nodeId,
    54,
  );

const buildEdgeSummary = (node: ApiNode) => {
  const { dvctId, usecaseContractId, dataProviderId, dataConsumerId, incentiveReceivedFrom = [] } =
    node.nodeMetadata || {};

  const summaryParts = [
    dvctId ? `DVCT ${dvctId}` : null,
    usecaseContractId ? `Contract ${formatReference(usecaseContractId, 32)}` : null,
    dataProviderId ? `From ${formatReference(dataProviderId, 28)}` : null,
    dataConsumerId ? `To ${formatReference(dataConsumerId, 28)}` : null,
    incentiveReceivedFrom.length > 0 ? `${getIncentiveTotal(incentiveReceivedFrom)} pts` : null,
  ].filter(Boolean);

  return summaryParts.join(' • ');
};

const flattenTree = (root: TreeApiNode): ApiNode[] => {
  const flattened: ApiNode[] = [];

  const walk = (node: TreeApiNode, parentId?: string) => {
    flattened.push({
      nodeId: node.nodeId,
      rawNodeId: node.rawNodeId || node.nodeId,
      canonicalKey: node.canonicalKey,
      nodeType: node.nodeType,
      dataId: node.dataId,
      participantId: node.participantId,
      participantShare: node.participantShare,
      participantSourceId: node.participantSourceId,
      usecaseContractTitle: node.usecaseContractTitle,
      nodeMetadata: node.nodeMetadata,
      prevNode: parentId ? [{ nodeId: parentId }] : [],
      childNode: node.childNode.map((child) => ({ nodeId: child.nodeId })),
    });

    node.childNode.forEach((child) => walk(child, node.nodeId));
  };

  walk(root);
  return flattened;
};

const getCanonicalNodeKey = (node: ApiNode) => {
  if (node.canonicalKey?.trim()) {
    return node.canonicalKey.trim();
  }

  return `node:${node.nodeId}`;
};

const dedupeIncentives = (incentives: Incentive[] = []) => {
  const seen = new Set<string>();

  return incentives.filter((incentive) => {
    const key = [
      incentive.organizationId,
      incentive.contractId,
      incentive.numPoints,
    ].join('::');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const mergeLinks = (links: { nodeId: string; '@nodeUrl'?: string }[]) => {
  const seen = new Set<string>();

  return links.filter((link) => {
    if (!link.nodeId || seen.has(link.nodeId)) {
      return false;
    }

    seen.add(link.nodeId);
    return true;
  });
};

const normalizeApiNodes = (data: ApiNode[]) => {
  const nodeIdToCanonicalKey = new Map<string, string>();

  data.forEach((node) => {
    nodeIdToCanonicalKey.set(node.nodeId, getCanonicalNodeKey(node));
  });

  const normalizedMap = new Map<string, ApiNode>();

  data.forEach((node) => {
    const canonicalKey = nodeIdToCanonicalKey.get(node.nodeId) || getCanonicalNodeKey(node);
    const existingNode = normalizedMap.get(canonicalKey);

    const prevNode = (node.prevNode || [])
      .map((link) => ({
        nodeId: nodeIdToCanonicalKey.get(link.nodeId) || link.nodeId,
        '@nodeUrl': link['@nodeUrl'],
      }))
      .filter((link) => link.nodeId !== canonicalKey);

    const childNode = (node.childNode || [])
      .map((link) => ({
        nodeId: nodeIdToCanonicalKey.get(link.nodeId) || link.nodeId,
        '@nodeUrl': link['@nodeUrl'],
      }))
      .filter((link) => link.nodeId !== canonicalKey);

    if (!existingNode) {
      normalizedMap.set(canonicalKey, {
        ...node,
        rawNodeId: node.rawNodeId || node.nodeId,
        nodeId: canonicalKey,
        canonicalKey,
        prevNode: mergeLinks(prevNode),
        childNode: mergeLinks(childNode),
        nodeMetadata: {
          ...node.nodeMetadata,
          incentiveReceivedFrom: dedupeIncentives(node.nodeMetadata?.incentiveReceivedFrom),
        },
      });

      return;
    }

    normalizedMap.set(canonicalKey, {
      ...existingNode,
      rawNodeId: existingNode.rawNodeId || node.rawNodeId || node.nodeId,
      canonicalKey,
      nodeType: existingNode.nodeType || node.nodeType,
      dataId: existingNode.dataId || node.dataId,
      participantId: existingNode.participantId || node.participantId,
      participantShare: Math.max(existingNode.participantShare || 0, node.participantShare || 0),
      participantSourceId: existingNode.participantSourceId || node.participantSourceId,
      usecaseContractTitle: existingNode.usecaseContractTitle || node.usecaseContractTitle,
      nodeMetadata: {
        dvctId: existingNode.nodeMetadata?.dvctId || node.nodeMetadata?.dvctId,
        usecaseContractId:
          existingNode.nodeMetadata?.usecaseContractId || node.nodeMetadata?.usecaseContractId,
        dataProviderId:
          existingNode.nodeMetadata?.dataProviderId || node.nodeMetadata?.dataProviderId,
        dataConsumerId:
          existingNode.nodeMetadata?.dataConsumerId || node.nodeMetadata?.dataConsumerId,
        incentiveReceivedFrom: dedupeIncentives([
          ...(existingNode.nodeMetadata?.incentiveReceivedFrom || []),
          ...(node.nodeMetadata?.incentiveReceivedFrom || []),
        ]),
      },
      prevNode: mergeLinks([...(existingNode.prevNode || []), ...prevNode]),
      childNode: mergeLinks([...(existingNode.childNode || []), ...childNode]),
    });
  });

  return Array.from(normalizedMap.values());
};

const getLayoutMetrics = (data: ApiNode[]) => {
  const nodeMap = new Map(data.map((node) => [node.nodeId, node]));
  const levelMap = new Map<string, number>();
  const queue = data
    .filter((node) => !node.prevNode || node.prevNode.length === 0)
    .map((node) => node.nodeId);

  if (queue.length === 0 && data[0]) {
    queue.push(data[0].nodeId);
  }

  queue.forEach((nodeId) => levelMap.set(nodeId, 0));

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    const currentNode = nodeMap.get(currentNodeId);
    const currentLevel = levelMap.get(currentNodeId) ?? 0;

    currentNode?.childNode?.forEach((child) => {
      const nextLevel = currentLevel + 1;
      const savedLevel = levelMap.get(child.nodeId);

      if (savedLevel === undefined || nextLevel > savedLevel) {
        levelMap.set(child.nodeId, nextLevel);
        queue.push(child.nodeId);
      }
    });
  }

  const levelCounts = Array.from(levelMap.values()).reduce<Record<number, number>>((acc, level) => {
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  return {
    maxDepth: Math.max(...Array.from(levelMap.values()), 0),
    widestLevelCount: Math.max(...Object.values(levelCounts), 1),
  };
};

const buildGraph = (data: ApiNode[]) => {
  const normalizedData = normalizeApiNodes(data);
  const { maxDepth, widestLevelCount } = getLayoutMetrics(normalizedData);
  const nodeMap = new Map(normalizedData.map((node) => [node.nodeId, node]));
  const levelMap = new Map<string, number>();
  const queue: string[] = normalizedData
    .filter((node) => !node.prevNode || node.prevNode.length === 0)
    .map((node) => node.nodeId);

  if (queue.length === 0 && normalizedData[0]) {
    queue.push(normalizedData[0].nodeId);
  }

  queue.forEach((nodeId) => levelMap.set(nodeId, 0));

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    const currentNode = nodeMap.get(currentNodeId);
    const currentLevel = levelMap.get(currentNodeId) ?? 0;

    currentNode?.childNode?.forEach((child) => {
      const nextLevel = currentLevel + 1;
      const savedLevel = levelMap.get(child.nodeId);

      if (savedLevel === undefined || nextLevel > savedLevel) {
        levelMap.set(child.nodeId, nextLevel);
        queue.push(child.nodeId);
      }
    });
  }

  const groupedLevels = Array.from(levelMap.entries()).reduce<Record<number, string[]>>(
    (levels, [nodeId, level]) => {
      if (!levels[level]) {
        levels[level] = [];
      }

      levels[level].push(nodeId);
      return levels;
    },
    {},
  );

  const horizontalSpacing = Math.max(400, Math.min(620, 340 + widestLevelCount * 28));
  const verticalSpacing = Math.max(420, Math.min(620, 360 + maxDepth * 32));

  const flowNodes: Node<FlowNodeData>[] = Object.entries(groupedLevels).flatMap(
    ([levelValue, nodeIds]) => {
      const level = Number(levelValue);
      const rowOffset = ((nodeIds.length - 1) * horizontalSpacing) / 2;

      return nodeIds.map((nodeId, index) => {
        const node = nodeMap.get(nodeId);
        const metadata = node?.nodeMetadata || {};
        const incentiveTotal = getIncentiveTotal(metadata.incentiveReceivedFrom);

        return {
          id: nodeId,
          type: 'dataNode',
          position: {
            x: index * horizontalSpacing - rowOffset,
            y: level * verticalSpacing,
          },
          data: {
            label:
              formatReference(
                node?.participantId ||
                  node?.dataId ||
                  metadata.usecaseContractId ||
                  metadata.dvctId ||
                  nodeId.replace(/^(data|usecase|node):/, ''),
                48,
              ),
            subtitle:
              truncateMiddle(
                node?.usecaseContractTitle ||
                  node?.participantSourceId ||
                  metadata.dvctId ||
                  metadata.usecaseContractId ||
                  node?.dataId ||
                  'No linked data id',
                52,
              ),
            nodeType: (node?.nodeType || 'trace_node').replace(/_/g, ' '),
            incentiveTotal,
            participantShare: node?.participantShare || incentiveTotal,
            providerId: formatReference(metadata.dataProviderId || 'Unknown', 34),
            consumerId: formatReference(metadata.dataConsumerId || 'Unknown', 34),
          },
        };
      });
    },
  );

  const flowEdges: Edge<FlowEdgeData>[] = normalizedData.flatMap((node) =>
    (node.childNode || [])
      .filter((child) => nodeMap.has(child.nodeId))
      .map((child) => {
        const childNode = nodeMap.get(child.nodeId)!;

        return {
          id: `${node.nodeId}-${child.nodeId}`,
          source: node.nodeId,
          target: child.nodeId,
          type: 'custom',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#8b5e18',
          },
          data: {
            label: buildEdgeSummary(childNode),
          },
        };
      }),
  );

  return { flowNodes, flowEdges, normalizedData };
};

export const DataNodes = () => {
  const [sourceNodes, setSourceNodes] = useState<ApiNode[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdgeData>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState('');
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<
    ReactFlowInstance<Node<FlowNodeData>, Edge<FlowEdgeData>> | null
  >(null);

  const hydrateGraph = useCallback(
    (graphSource: ApiNode[]) => {
      const { flowNodes, flowEdges, normalizedData } = buildGraph(graphSource);

      setSourceNodes(normalizedData);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNodeId(flowNodes[0]?.id ?? null);
      setSelectedEdgeId(null);
    },
    [setEdges, setNodes],
  );

  const loadAllNodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allNodes = await getNodes();
      setActiveRoot(null);
      hydrateGraph(allNodes);
    } catch (loadError) {
      setError('Unable to load node data. Check that the Express API is running.');
    } finally {
      setLoading(false);
    }
  }, [hydrateGraph]);

  useEffect(() => {
    void loadAllNodes();
  }, [loadAllNodes]);

  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((existingEdges) =>
        addEdge({ ...params, type: 'custom', markerEnd: { type: MarkerType.ArrowClosed } }, existingEdges),
      ),
    [setEdges],
  );

  const focusOnSubtree = useCallback(async () => {
    if (!focusNodeId.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tree = await getNodesTree(focusNodeId.trim());
      const subtree = flattenTree(tree);
      setActiveRoot(focusNodeId.trim());
      hydrateGraph(subtree);
    } catch (focusError) {
      setError(`No subtree found for node "${focusNodeId.trim()}".`);
    } finally {
      setLoading(false);
    }
  }, [focusNodeId, hydrateGraph]);

  const resetGraph = useCallback(() => {
    setFocusNodeId('');
    void loadAllNodes();
  }, [loadAllNodes]);

  const selectedNode = useMemo(
    () => sourceNodes.find((node) => node.nodeId === selectedNodeId) ?? null,
    [selectedNodeId, sourceNodes],
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const rootNodesCount = useMemo(
    () => sourceNodes.filter((node) => !node.prevNode || node.prevNode.length === 0).length,
    [sourceNodes],
  );

  const totalIncentive = useMemo(
    () =>
      sourceNodes.reduce(
        (sum, node) => sum + getIncentiveTotal(node.nodeMetadata.incentiveReceivedFrom),
        0,
      ),
    [sourceNodes],
  );

  const fitViewPadding = useMemo(() => {
    if (nodes.length <= 2) {
      return 0.62;
    }

    if (nodes.length <= 5) {
      return 0.48;
    }

    if (nodes.length <= 10) {
      return 0.36;
    }

    return 0.28;
  }, [nodes.length]);

  useEffect(() => {
    if (!reactFlowInstance || loading || error || nodes.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      reactFlowInstance.fitView({
        padding: fitViewPadding,
        includeHiddenNodes: true,
        minZoom: 0.18,
        maxZoom: 1.05,
        duration: 300,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [error, fitViewPadding, loading, nodes.length, reactFlowInstance]);

  const handleNodeClick: NodeMouseHandler<Node<FlowNodeData>> = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  return (
    <section className="graph-dashboard">
      <aside className="graph-panel graph-panel--sidebar">
        <div className="graph-panel__section">
          <p className="graph-panel__label">Workspace</p>
          <h2>Map the chain with context-first controls</h2>
          <p className="graph-panel__text">
            Switch between the full network and a focused subtree, then inspect
            details in the side panel instead of reading raw JSON on the canvas.
          </p>
        </div>

        <div className="graph-panel__section graph-panel__section--surface">
          <label className="graph-field" htmlFor="focus-node-id">
            <span>Focus on node</span>
            <input
              id="focus-node-id"
              value={focusNodeId}
              onChange={(event) => setFocusNodeId(event.target.value)}
              placeholder="Enter a nodeId"
            />
          </label>

          <div className="graph-actions">
            <button className="graph-button graph-button--primary" onClick={() => void focusOnSubtree()} type="button">
              Show subtree
            </button>
            <button className="graph-button graph-button--ghost" onClick={resetGraph} type="button">
              Reset view
            </button>
          </div>

          {activeRoot ? (
            <p className="graph-status">Focused on subtree rooted at {activeRoot}.</p>
          ) : (
            <p className="graph-status">Viewing the complete network.</p>
          )}
        </div>

        <div className="graph-panel__section graph-panel__section--surface">
          <p className="graph-panel__label">Snapshot</p>
          <div className="graph-stats">
            <article>
              <strong>{sourceNodes.length}</strong>
              <span>Visible nodes</span>
            </article>
            <article>
              <strong>{edges.length}</strong>
              <span>Connections</span>
            </article>
            <article>
              <strong>{rootNodesCount}</strong>
              <span>Root nodes</span>
            </article>
            <article>
              <strong>{totalIncentive}</strong>
              <span>Total points</span>
            </article>
          </div>
        </div>
      </aside>

      <div className="graph-canvas-shell">
        <div className="graph-canvas-shell__header">
          <div className="graph-canvas-shell__heading">
            <p className="graph-panel__label">Network view</p>
            <h2>{activeRoot ? `Subtree: ${activeRoot}` : 'Full chain overview'}</h2>
            <p className="graph-canvas-shell__hint">
              Select a node to inspect metadata.
            </p>
          </div>
        </div>

        <div className="graph-canvas-shell__surface">
          {loading ? <div className="graph-feedback">Loading graph data...</div> : null}
          {!loading && error ? <div className="graph-feedback graph-feedback--error">{error}</div> : null}
          {!loading && !error && nodes.length === 0 ? (
            <div className="graph-feedback">No nodes available to display.</div>
          ) : null}

          {!loading && !error && nodes.length > 0 ? (
            <ReactFlow<Node<FlowNodeData>, Edge<FlowEdgeData>>
              fitView
              fitViewOptions={{
                padding: fitViewPadding,
                minZoom: 0.18,
              }}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              defaultEdgeOptions={{
                type: 'custom',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#8b5e18',
                },
              }}
              minZoom={0.18}
              maxZoom={1.05}
              onInit={setReactFlowInstance}
              style={{ background: 'transparent' }}
            >
              <MiniMap
                nodeColor="#d7a63c"
                maskColor="rgba(27, 19, 8, 0.08)"
                pannable
                zoomable
              />
              <Controls showInteractive={false} />
              <Background color="rgba(92, 67, 34, 0.16)" gap={24} />
            </ReactFlow>
          ) : null}
        </div>
      </div>

      <aside className="graph-panel graph-panel--details">
        <div className="graph-panel__section">
          <p className="graph-panel__label">Inspector</p>
          <h2>Selected details</h2>
        </div>

        {selectedNode ? (
          <div className="graph-panel__section graph-panel__section--surface">
            <div className="graph-detail-card__header">
              <h3>{getInspectorHeading(selectedNode)}</h3>
              <span>{getIncentiveTotal(selectedNode.nodeMetadata.incentiveReceivedFrom)} pts</span>
            </div>

            <dl className="graph-detail-list">
              <div>
                  <dt>Node ID</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--technical">
                  {selectedNode.rawNodeId || selectedNode.nodeId}
                </dd>
              </div>
              <div>
                <dt>Data ID</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--technical">
                  {selectedNode.dataId || 'N/A'}
                </dd>
              </div>
              <div>
                <dt>Node type</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--emphasis">
                  {(selectedNode.nodeType || 'N/A').replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt>Canonical key</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--technical">
                  {selectedNode.canonicalKey || selectedNode.nodeId}
                </dd>
              </div>
              <div>
                <dt>DVCT ID</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--emphasis">
                  {selectedNode.nodeMetadata.dvctId || 'N/A'}
                </dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--technical">
                  {selectedNode.nodeMetadata.dataProviderId || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt>Consumer</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--technical">
                  {selectedNode.nodeMetadata.dataConsumerId || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt>Use case contract</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--technical">
                  {selectedNode.nodeMetadata.usecaseContractId || 'N/A'}
                </dd>
              </div>
              <div>
                <dt>Parents / Children</dt>
                <dd className="graph-detail-list__value graph-detail-list__value--emphasis">
                  {selectedNode.prevNode.length} / {selectedNode.childNode.length}
                </dd>
              </div>
            </dl>

            <div className="graph-detail-list graph-detail-list--stacked">
              <div>
                <dt>Incentive sources</dt>
                <dd>
                  {selectedNode.nodeMetadata.incentiveReceivedFrom?.length ? (
                    <ul className="graph-chip-list">
                      {selectedNode.nodeMetadata.incentiveReceivedFrom.map((incentive) => (
                        <li key={`${incentive.organizationId}-${incentive.contractId}`}>
                          {incentive.organizationId}: {incentive.numPoints} pts
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'No incentive data'
                  )}
                </dd>
              </div>
            </div>
          </div>
        ) : null}

        {!selectedNode && selectedEdge ? (
          <div className="graph-panel__section graph-panel__section--surface">
            <div className="graph-detail-card__header">
              <h3>Connection summary</h3>
            </div>
            <p className="graph-panel__text">{selectedEdge.data?.label || 'No summary available.'}</p>
            <p className="graph-panel__text">
              {selectedEdge.source} → {selectedEdge.target}
            </p>
          </div>
        ) : null}

        {!selectedNode && !selectedEdge ? (
          <div className="graph-panel__section graph-panel__section--surface">
            <p className="graph-panel__text">
              Select a node or edge in the graph to inspect its details here.
            </p>
          </div>
        ) : null}
      </aside>
    </section>
  );
};
