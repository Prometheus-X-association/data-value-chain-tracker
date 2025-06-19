import React, {useCallback, useEffect, useState} from 'react';
import {EdgeTypes, OnConnect, ReactFlow, useEdgesState, useNodesState, addEdge, Background, Controls} from '@xyflow/react';
import axios from 'axios';
import _ from 'lodash'; 
import '@xyflow/react/dist/style.css';
import './DataNodes.css'
import CustomEdge from './CustomEdge';
import CustomEdgeStartEnd from './CustomEdgeStartEnd';

export const getNodes = async() => {
    return axios.get('http://localhost:3001/api/data');
};

export const getNodesTree= async(nodeId: string) => {
    return axios.get('http://localhost:3001/api/node-tree/' + nodeId);
};


export const  DataNodes = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [nodesEdges, setNodesEdges, onEdgesChange] = useEdgesState<any>([]);
    const [nodeId, setNodeId] = useState<string>('');
    const onConnect: OnConnect = useCallback(
      (params) => setNodesEdges((eds) => addEdge(params, eds)),
      [setNodesEdges],
    );

    const edgeTypes: EdgeTypes = {
      custom: CustomEdge,
      'start-end': CustomEdgeStartEnd,
    };

    const getNodesData = async() =>{
        try{
            var res = await getNodes();
            createNodes(res.data)
        }catch(error){
            console.log(error);
        }
    }

    const getChildrenOfNode = async () => {
        try {
          const allNodes = await getNodes();
          createNodes(allNodes.data, nodeId); // pass the root nodeId for subtree traversal
        } catch (error) {
          console.log(error);
        }
    };

    const createNodes = (data: any[], rootNodeId?: string) => {
        const spacingX = 200;
        const spacingY = 120;
      
        const nodeMap = _.keyBy(data, 'nodeId');
        const levels: Record<number, string[]> = {};
        const visited: Set<string> = new Set();
      
        const assignLevels = (nodeId: string, level: number) => {
          if (!levels[level]) levels[level] = [];
          if (!visited.has(nodeId)) {
            levels[level].push(nodeId);
            visited.add(nodeId);
            nodeMap[nodeId]?.childNode?.forEach((child: any) =>
              assignLevels(child.nodeId, level + 1)
            );
          }
        };
      
        if (rootNodeId) {
            assignLevels(rootNodeId, 0);
        }else {
            data.filter(n => n.prevNode.length === 0).forEach(n => assignLevels(n.nodeId, 0));
        }
      
        // Calculate layout
        const positionedNodes: any[] = [];
        Object.entries(levels).forEach(([levelStr, nodeIds]) => {
          const level = parseInt(levelStr);
          nodeIds.forEach((nodeId, i) => {
            positionedNodes.push({
              id: nodeId,
              position: {
                x: i * spacingX,
                y: level * spacingY,
              },
              data: { label: nodeId }
            });
          });
        });
      
        // Calculate bounding box
        const minX = Math.min(...positionedNodes.map(n => n.position.x));
        const minY = Math.min(...positionedNodes.map(n => n.position.y));
        const maxX = Math.max(...positionedNodes.map(n => n.position.x));
        const maxY = Math.max(...positionedNodes.map(n => n.position.y));
      
        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
      
        const centerOffsetX = (window.innerWidth - graphWidth) / 2 - minX;
        const centerOffsetY = (window.innerHeight - graphHeight) / 2 - minY;
      
        // Apply centering offset
        positionedNodes.forEach(node => {
          node.position.x += centerOffsetX;
          node.position.y += centerOffsetY;
        });
      
        // Build edges
        const edges = data.slice(0, -1).map((node: any, index: number) => ({
          id: `${node.nodeId}-${data[index + 1].nodeId}`,
          source: node.nodeId,
          target: data[index + 1].nodeId,
          label: JSON.stringify(data[index + 1].nodeMetadata), // << use NEXT node's metadata
        }));
      
        setNodes(positionedNodes);
        setNodesEdges(edges);
      };

    useEffect(() => {
        getNodesData();
    }, []);

    
    const renderApp = useCallback(() => {
        var result = false;
        if(nodes){
            result = true;
        }
        return result;
    },[nodes]);


    return renderApp() === false ? (<div></div>) : (
        <div style={{width: '100vw', height: '100vh'}}>
           
            <ReactFlow
              nodes={nodes}
              edges={nodesEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              edgeTypes={edgeTypes}
              fitView
              style={{ backgroundColor: "#F7F9FB" }}
            >
            <Controls />
            <Background />
            <div className="show-structure">
                <button onClick={() => {
                        if(nodeId){
                            getChildrenOfNode()
                        }
                    }
                } 
                type='submit'>Show structure</button>
                <input placeholder='nodeId' onChange={(event: React.ChangeEvent<HTMLInputElement>) =>{setNodeId(event?.target.value)}}></input>
            </div>
          </ReactFlow>
        </div>
    );
}
