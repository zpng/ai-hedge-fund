import { type NodeTypes } from '@xyflow/react';

import { AgentNode } from './components/agent-node';
import { JsonOutputNode } from './components/json-output-node';
import { TextInputNode } from './components/text-input-node';
import { TextOutputNode } from './components/text-output-node';
import { type AppNode } from './types';
import { agents } from '@/data/agents';

// Types
export * from './types';

export const initialNodes: AppNode[] = [
  {
    id: 'text-input-node',
    type: 'input-node',
    position: { x: 0, y: 0 },
    data: {
      name: 'Input',
      description: 'Start Node',
      status: 'Idle',
    },
  },
  {
    id: 'text-output-node',
    type: 'text-output-node',
    position: { x: 800, y: 0 },
    data: {
      name: 'Text Output',
      description: 'Output Node',
      status: 'Idle',
    },
  },
  // Add all agent nodes in a grid layout
  ...agents.map((agent, index) => ({
    id: agent.key,
    type: 'agent-node',
    // Position agents in a grid layout between input and output
    position: { 
      x: 400, 
      y: -300 + (index * 100) // Distribute vertically with 100px spacing
    },
    data: {
      name: agent.display_name,
      description: agent.description || '',
      status: 'Idle',
    },
  })),
];

// Create edges connecting input to all agents and all agents to output
export const initialEdges = [
  // Connect input to all agents
  ...agents.map((agent) => ({
    id: `text-input-node-${agent.key}`,
    source: 'text-input-node',
    target: agent.key,
    markerEnd: { type: 'arrowclosed' },
  })),
  // Connect all agents to output
  ...agents.map((agent) => ({
    id: `${agent.key}-text-output-node`,
    source: agent.key,
    target: 'text-output-node',
    markerEnd: { type: 'arrowclosed' },
  })),
];

export const nodeTypes = {
  'agent-node': AgentNode,
  'input-node': TextInputNode,
  'text-output-node': TextOutputNode,
  'json-output-node': JsonOutputNode,
} satisfies NodeTypes;
