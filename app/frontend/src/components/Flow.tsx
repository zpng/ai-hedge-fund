import {
  Background,
  ColorMode,
  Connection,
  Controls,
  Edge,
  MarkerType,
  Panel,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import { useCallback, useState } from 'react';
import { ArrowLeft, Home } from 'lucide-react';

import '@xyflow/react/dist/style.css';

import { AppNode } from '@/nodes/types';
import { edgeTypes } from '../edges';
import { initialNodes, nodeTypes } from '../nodes';
import { Button } from './ui/button';

type FlowProps = {
  className?: string;
  onGoToHome?: () => void;
};

export function Flow({ className = '', onGoToHome }: FlowProps) {
  const [colorMode] = useState<ColorMode>('dark');
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const proOptions = { hideAttribution: true };
  
  // Initialize the flow when it first renders
  const onInit = useCallback(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Connect two nodes with marker
  const onConnect = useCallback(
    (connection: Connection) => {
      // Create a new edge with a marker and unique ID
      const newEdge: Edge = {
        ...connection,
        id: `edge-${Date.now()}`, // Add unique ID
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Reset the flow to initial state
  const resetFlow = useCallback(() => {
    setNodes(initialNodes);
    setEdges([]);
  }, [setNodes, setEdges]);

  // Handle browser back button
  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        edges={edges}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        colorMode={colorMode}
        proOptions={proOptions}
        fitView
      >
        <Background gap={13}/>
        <Controls 
          position="bottom-center" 
          orientation="horizontal" 
          style={{ bottom: 20 }}
        />
        <Panel position="top-right">
          <div className="flex gap-2">
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            {onGoToHome && (
              <Button
                onClick={onGoToHome}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Home className="w-4 h-4" />
                个人中心
              </Button>
            )}
            <Button
              onClick={resetFlow}
              size="sm"
            >
              Reset Flow
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}