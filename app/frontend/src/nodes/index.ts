import { Edge, type NodeTypes, MarkerType} from '@xyflow/react';
import { AgentNode } from './components/agent-node';
import { InvestmentReportNode } from './components/investment-report-node';
import { JsonOutputNode } from './components/json-output-node';
import { PortfolioManagerNode } from './components/portfolio-manager-node';
import { type AppNode } from './types';

// Types
export * from './types';

export const initialNodes: AppNode[] = [
  {
    id: 'portfolio-manager-node',
    type: 'portfolio-manager-node',
    position: { x: 0, y: 0 },
    data: {
      name: 'Portfolio Manager',
      description: 'Start Node',
      status: 'Idle',
    },
  },
  {
    id: 'aswath_damodaran',
    type: 'agent-node',
    position: { x: 300, y: -100 },
    data: {
      name: 'Aswath Damodaran',
      description: 'Intrinsic Value Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'warren_buffett',
    type: 'agent-node',
    position: { x: 300, y: -50 },
    data: {
      name: 'Warren Buffett',
      description: 'Value Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'charlie_munger',
    type: 'agent-node',
    position: { x: 300, y: 0 },
    data: {
      name: 'Charlie Munger',
      description: 'Quality Business Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'peter_lynch',
    type: 'agent-node',
    position: { x: 300, y: 50 },
    data: {
      name: 'Peter Lynch',
      description: 'Growth at Reasonable Price Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'bill_ackman',
    type: 'agent-node',
    position: { x: 300, y: 100 },
    data: {
      name: 'Bill Ackman',
      description: 'Activist Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'cathie_wood',
    type: 'agent-node',
    position: { x: 300, y: 150 },
    data: {
      name: 'Cathie Wood',
      description: 'Innovation & Disruptive Growth Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'michael_burry',
    type: 'agent-node',
    position: { x: 300, y: 200 },
    data: {
      name: 'Michael Burry',
      description: 'Contrarian Value Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'investment-report-node',
    type: 'investment-report-node',
    position: { x: 600, y: 75 },
    data: {
      name: 'Investment Report',
      description: 'End Node',
      status: 'Idle',
    },
  },
];

export const initialEdges: Edge[] = [
  // Portfolio Manager to all agents
  { id: 'e1-1', source: 'portfolio-manager-node', target: 'aswath_damodaran' },
  { id: 'e1-2', source: 'portfolio-manager-node', target: 'warren_buffett' },
  { id: 'e1-3', source: 'portfolio-manager-node', target: 'charlie_munger' },
  { id: 'e1-4', source: 'portfolio-manager-node', target: 'peter_lynch' },
  { id: 'e1-5', source: 'portfolio-manager-node', target: 'bill_ackman' },
  { id: 'e1-6', source: 'portfolio-manager-node', target: 'cathie_wood' },
  { id: 'e1-7', source: 'portfolio-manager-node', target: 'michael_burry' },
  
  // All agents to Investment Report
  { id: 'e2-1', source: 'aswath_damodaran', target: 'investment-report-node' },
  { id: 'e2-2', source: 'warren_buffett', target: 'investment-report-node' },
  { id: 'e2-3', source: 'charlie_munger', target: 'investment-report-node' },
  { id: 'e2-4', source: 'peter_lynch', target: 'investment-report-node' },
  { id: 'e2-5', source: 'bill_ackman', target: 'investment-report-node' },
  { id: 'e2-6', source: 'cathie_wood', target: 'investment-report-node' },
  { id: 'e2-7', source: 'michael_burry', target: 'investment-report-node' },
];

export const nodeTypes = {
  'agent-node': AgentNode,
  'portfolio-manager-node': PortfolioManagerNode,
  'investment-report-node': InvestmentReportNode,
  'json-output-node': JsonOutputNode,
} satisfies NodeTypes;
