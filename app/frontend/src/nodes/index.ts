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
    position: { x: -150, y: 0 },
    data: {
      name: '投资组合管理器',
      description: '起始节点',
      status: '空闲',
    },
  },
  {
    id: 'aswath_damodaran',
    type: 'agent-node',
    position: { x: 300, y: -400 },
    data: {
      name: '阿斯沃斯·达莫达兰',
      description: '内在价值分析专家',
      status: '空闲',
    },
  },
  {
    id: 'warren_buffett',
    type: 'agent-node',
    position: { x: 300, y: -320 },
    data: {
      name: '沃伦·巴菲特',
      description: '价值投资专家',
      status: '空闲',
    },
  },
  {
    id: 'charlie_munger',
    type: 'agent-node',
    position: { x: 300, y: -240 },
    data: {
      name: '查理·芒格',
      description: '优质企业分析专家',
      status: '空闲',
    },
  },
  {
    id: 'peter_lynch',
    type: 'agent-node',
    position: { x: 300, y: -160 },
    data: {
      name: '彼得·林奇',
      description: '合理价格成长投资专家',
      status: '空闲',
    },
  },
  {
    id: 'bill_ackman',
    type: 'agent-node',
    position: { x: 300, y: -80 },
    data: {
      name: '比尔·阿克曼',
      description: '激进投资专家',
      status: '空闲',
    },
  },
  {
    id: 'cathie_wood',
    type: 'agent-node',
    position: { x: 300, y: 0 },
    data: {
      name: '凯西·伍德',
      description: '创新与颠覆性增长专家',
      status: '空闲',
    },
  },
  {
    id: 'michael_burry',
    type: 'agent-node',
    position: { x: 300, y: 80 },
    data: {
      name: '迈克尔·伯里',
      description: '逆向价值投资专家',
      status: '空闲',
    },
  },
  {
    id: 'stanley_druckenmiller',
    type: 'agent-node',
    position: { x: 300, y: 160 },
    data: {
      name: '斯坦利·德鲁肯米勒',
      description: '宏观交易专家',
      status: '空闲',
    },
  },
  {
    id: 'phil_fisher',
    type: 'agent-node',
    position: { x: 300, y: 240 },
    data: {
      name: '菲利普·费雪',
      description: '成长投资专家',
      status: '空闲',
    },
  },
  {
    id: 'ben_graham',
    type: 'agent-node',
    position: { x: 300, y: 320 },
    data: {
      name: '本杰明·格雷厄姆',
      description: '价值投资先驱',
      status: '空闲',
    },
  },
  {
    id: 'rakesh_jhunjhunwala',
    type: 'agent-node',
    position: { x: 300, y: 400 },
    data: {
      name: '拉凯什·朱恩朱恩瓦拉',
      description: '印度市场专家',
      status: '空闲',
    },
  },
  {
    id: 'sentiment_analyst',
    type: 'agent-node',
    position: { x: 300, y: 480 },
    data: {
      name: '情绪分析师',
      description: '市场情绪分析专家',
      status: '空闲',
    },
  },
  {
    id: 'technical_analyst',
    type: 'agent-node',
    position: { x: 300, y: 560 },
    data: {
      name: '技术分析师',
      description: '技术分析专家',
      status: '空闲',
    },
  },
  {
    id: 'fundamentals_analyst',
    type: 'agent-node',
    position: { x: 300, y: 640 },
    data: {
      name: '基本面分析师',
      description: '基本面分析专家',
      status: '空闲',
    },
  },
  {
    id: 'valuation_analyst',
    type: 'agent-node',
    position: { x: 300, y: 720 },
    data: {
      name: '估值分析师',
      description: '估值分析专家',
      status: '空闲',
    },
  },
  {
    id: 'risk_manager',
    type: 'agent-node',
    position: { x: 300, y: 800 },
    data: {
      name: 'Risk Manager',
      description: '风险管理专家',
      status: '空闲',
    },
  },
  {
    id: 'investment-report-node',
    type: 'investment-report-node',
    position: { x: 750, y: 200 },
    data: {
      name: '投资报告',
      description: '输出节点',
      status: '空闲',
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
