import React, {useCallback, useEffect, useState} from 'react';
import {ReactFlow, useEdgesState, useNodesState} from '@xyflow/react';
import axios from 'axios';
import _ from 'lodash'; 
import '@xyflow/react/dist/style.css';
import './DataNodes.css'


export const getNodes = async() => {
    return axios.get('http://localhost:3001/api/data');
};

export const getNodesTree= async(nodeId: string) => {
    return axios.get('http://localhost:3001/api/node-tree/' + nodeId);
};

export const  DataNodes = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [nodesEdges, setNodesEdges, onEdgesChange] = useEdgesState([]);
    const [nodeId, setNodeId] = useState<string>('');

    const getNodesData = async() =>{
        try{
            var res = await getNodes();
            createNodes(res.data)
        }catch(error){
            console.log(error);
        }
    }

    const getChildrenOfNode = async() =>{
        var array = [];
        var allNodeIds = [nodeId]

        var allNodes = await getNodes();
        var res = await getNodesTree(nodeId);
        
        res.data.childNode.map((obj: any) =>{
            allNodeIds.push(obj.nodeId);
        })
          
        for(const obj of allNodes.data){
            if(obj.nodeId === nodeId ||  allNodeIds.includes(obj.nodeId)){
                array.push(obj)
            }
        }
        createNodes(array);
    }

    const createNodes =  (data: any) =>{
        var array: any = [];
        var arrayEdges: any = [];
        var posX: number = 500;
        var posY: number = 30;

        data.map((obj: any) =>{
            if(obj.prevNode.length === 0){
                array.push({id: obj.nodeId, position: {x: posX , y: posY}, data: {label: obj.nodeId}});
                posX = posX + 180;
            }
        });

        data.map((obj: any) => {
            posY = posY + 80;
            if(array.filter((node: any) => node.id === obj.nodeId).length === 0){
                array.push({id: obj.nodeId, position: {x: posX , y: posY}, data: {label: obj.nodeId}});
            }

            obj.childNode.map((child:any) =>{
                if(array.filter((node: any) => node.id === child.nodeId).length === 0) {
                    array.push({id: child.nodeId, position: {x : posX, y: posY +40 }, data: {label: child.nodeId}});
                    posX = posX - 180;
                }
                arrayEdges.push({
                    id: child.nodeId + '-' + obj.nodeId, 
                    source: obj.nodeId, 
                    target: child.nodeId,
                    label: JSON.stringify(obj.nodeMetadata)
                });
            });
        });
        setNodes(array);
        setNodesEdges(arrayEdges);
    }

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
            <ReactFlow nodes={nodes} edges={nodesEdges} onNodesChange={onNodesChange}
                       onEdgesChange={onEdgesChange}/>
        </div>
    );
}
