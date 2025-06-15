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
    position: { x: 300, y: -200 },
    data: {
      name: 'Aswath Damodaran',
      description: 'Intrinsic Value Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'warren_buffett',
    type: 'agent-node',
    position: { x: 300, y: -170 },
    data: {
      name: 'Warren Buffett',
      description: 'Value Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'charlie_munger',
    type: 'agent-node',
    position: { x: 300, y: -140 },
    data: {
      name: 'Charlie Munger',
      description: 'Quality Business Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'peter_lynch',
    type: 'agent-node',
    position: { x: 300, y: -110 },
    data: {
      name: 'Peter Lynch',
      description: 'Growth at Reasonable Price Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'bill_ackman',
    type: 'agent-node',
    position: { x: 300, y: -80 },
    data: {
      name: 'Bill Ackman',
      description: 'Activist Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'cathie_wood',
    type: 'agent-node',
    position: { x: 300, y: -50 },
    data: {
      name: 'Cathie Wood',
      description: 'Innovation & Disruptive Growth Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'michael_burry',
    type: 'agent-node',
    position: { x: 300, y: -20 },
    data: {
      name: 'Michael Burry',
      description: 'Contrarian Value Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'stanley_druckenmiller',
    type: 'agent-node',
    position: { x: 300, y: 10 },
    data: {
      name: 'Stanley Druckenmiller',
      description: 'Macro Trading Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'phil_fisher',
    type: 'agent-node',
    position: { x: 300, y: 40 },
    data: {
      name: 'Phil Fisher',
      description: 'Growth Investing Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'ben_graham',
    type: 'agent-node',
    position: { x: 300, y: 70 },
    data: {
      name: 'Ben Graham',
      description: 'Value Investing Pioneer',
      status: 'Idle',
    },
  },
  {
    id: 'rakesh_jhunjhunwala',
    type: 'agent-node',
    position: { x: 300, y: 100 },
    data: {
      name: 'Rakesh Jhunjhunwala',
      description: 'Indian Market Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'sentiment_analyst',
    type: 'agent-node',
    position: { x: 300, y: 130 },
    data: {
      name: 'Sentiment Analyst',
      description: 'Market Sentiment Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'technical_analyst',
    type: 'agent-node',
    position: { x: 300, y: 160 },
    data: {
      name: 'Technical Analyst',
      description: 'Technical Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'fundamentals_analyst',
    type: 'agent-node',
    position: { x: 300, y: 190 },
    data: {
      name: 'Fundamentals Analyst',
      description: 'Fundamental Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'valuation_analyst',
    type: 'agent-node',
    position: { x: 300, y: 220 },
    data: {
      name: 'Valuation Analyst',
      description: 'Valuation Analysis Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'risk_manager',
    type: 'agent-node',
    position: { x: 300, y: 250 },
    data: {
      name: 'Risk Manager',
      description: 'Risk Management Specialist',
      status: 'Idle',
    },
  },
  {
    id: 'investment-report-node',
    type: 'investment-report-node',
    position: { x: 600, y: 25 },
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
  { id: 'e1-8', source: 'portfolio-manager-node', target: 'stanley_druckenmiller' },
  { id: 'e1-9', source: 'portfolio-manager-node', target: 'phil_fisher' },
  { id: 'e1-10', source: 'portfolio-manager-node', target: 'ben_graham' },
  { id: 'e1-11', source: 'portfolio-manager-node', target: 'rakesh_jhunjhunwala' },
  { id: 'e1-12', source: 'portfolio-manager-node', target: 'sentiment_analyst' },
  { id: 'e1-13', source: 'portfolio-manager-node', target: 'technical_analyst' },
  { id: 'e1-14', source: 'portfolio-manager-node', target: 'fundamentals_analyst' },
  { id: 'e1-15', source: 'portfolio-manager-node', target: 'valuation_analyst' },
  { id: 'e1-16', source: 'portfolio-manager-node', target: 'risk_manager' },
  
  // All agents to Investment Report
  { id: 'e2-1', source: 'aswath_damodaran', target: 'investment-report-node' },
  { id: 'e2-2', source: 'warren_buffett', target: 'investment-report-node' },
  { id: 'e2-3', source: 'charlie_munger', target: 'investment-report-node' },
  { id: 'e2-4', source: 'peter_lynch', target: 'investment-report-node' },
  { id: 'e2-5', source: 'bill_ackman', target: 'investment-report-node' },
  { id: 'e2-6', source: 'cathie_wood', target: 'investment-report-node' },
  { id: 'e2-7', source: 'michael_burry', target: 'investment-report-node' },
  { id: 'e2-8', source: 'stanley_druckenmiller', target: 'investment-report-node' },
  { id: 'e2-9', source: 'phil_fisher', target: 'investment-report-node' },
  { id: 'e2-10', source: 'ben_graham', target: 'investment-report-node' },
  { id: 'e2-11', source: 'rakesh_jhunjhunwala', target: 'investment-report-node' },
  { id: 'e2-12', source: 'sentiment_analyst', target: 'investment-report-node' },
  { id: 'e2-13', source: 'technical_analyst', target: 'investment-report-node' },
  { id: 'e2-14', source: 'fundamentals_analyst', target: 'investment-report-node' },
  { id: 'e2-15', source: 'valuation_analyst', target: 'investment-report-node' },
  { id: 'e2-16', source: 'risk_manager', target: 'investment-report-node' },
];

export const nodeTypes = {
  'agent-node': AgentNode,
  'portfolio-manager-node': PortfolioManagerNode,
  'investment-report-node': InvestmentReportNode,
  'json-output-node': JsonOutputNode,
} satisfies NodeTypes;
