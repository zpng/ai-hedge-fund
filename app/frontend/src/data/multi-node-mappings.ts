export interface MultiNodeDefinition {
  name: string;
  nodes: {
    componentName: string;
    offsetX: number;
    offsetY: number;
  }[];
  edges: {
    source: string;
    target: string;
  }[];
}

const multiNodeDefinition: Record<string, MultiNodeDefinition> = {
  "价值投资团队": {
    name: "价值投资团队",
    nodes: [
      { componentName: "投资组合管理器", offsetX: 0, offsetY: 0 },
      { componentName: "本杰明·格雷厄姆", offsetX: 400, offsetY: -300 },
      { componentName: "查理·芒格", offsetX: 400, offsetY: 0 },
      { componentName: "沃伦·巴菲特", offsetX: 400, offsetY: 300 },
      { componentName: "投资报告", offsetX: 800, offsetY: 0 },
    ],
    edges: [
      { source: "投资组合管理器", target: "本杰明·格雷厄姆" },
      { source: "投资组合管理器", target: "查理·芒格" },
      { source: "投资组合管理器", target: "沃伦·巴菲特" },
      { source: "本杰明·格雷厄姆", target: "投资报告" },
      { source: "查理·芒格", target: "投资报告" },
      { source: "沃伦·巴菲特", target: "投资报告" },
    ],
  },
  "数据分析团队": {
    name: "数据分析团队",
    nodes: [
      { componentName: "投资组合管理器", offsetX: 0, offsetY: 0 },
      { componentName: "技术分析师", offsetX: 400, offsetY: -550 },
      { componentName: "基本面分析师", offsetX: 400, offsetY: -200 },
      { componentName: "情绪分析师", offsetX: 400, offsetY: 150 },
      { componentName: "估值分析师", offsetX: 400, offsetY: 500 },
      { componentName: "投资报告", offsetX: 800, offsetY: 0 },
    ],
    edges: [
      { source: "投资组合管理器", target: "技术分析师" },
      { source: "投资组合管理器", target: "基本面分析师" },
      { source: "投资组合管理器", target: "情绪分析师" },
      { source: "投资组合管理器", target: "估值分析师" },
      { source: "技术分析师", target: "投资报告" },
      { source: "基本面分析师", target: "投资报告" },
      { source: "情绪分析师", target: "投资报告" },
      { source: "估值分析师", target: "投资报告" },
    ],
  }
};

export function getMultiNodeDefinition(name: string): MultiNodeDefinition | null {
  return multiNodeDefinition[name] || null;
}

export function isMultiNodeComponent(componentName: string): boolean {
  return componentName in multiNodeDefinition;
}