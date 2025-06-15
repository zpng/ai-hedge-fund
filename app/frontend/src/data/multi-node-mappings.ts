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
      { componentName: "Ben Graham", offsetX: 400, offsetY: -300 },
      { componentName: "Charlie Munger", offsetX: 400, offsetY: 0 },
      { componentName: "Warren Buffett", offsetX: 400, offsetY: 300 },
      { componentName: "投资报告", offsetX: 800, offsetY: 0 },
    ],
    edges: [
      { source: "投资组合管理器", target: "Ben Graham" },
      { source: "投资组合管理器", target: "Charlie Munger" },
      { source: "投资组合管理器", target: "Warren Buffett" },
      { source: "Ben Graham", target: "投资报告" },
      { source: "Charlie Munger", target: "投资报告" },
      { source: "Warren Buffett", target: "投资报告" },
    ],
  },
  "数据分析团队": {
    name: "数据分析团队",
    nodes: [
      { componentName: "投资组合管理器", offsetX: 0, offsetY: 0 },
      { componentName: "Technical Analyst", offsetX: 400, offsetY: -550 },
      { componentName: "Fundamentals Analyst", offsetX: 400, offsetY: -200 },
      { componentName: "Sentiment Analyst", offsetX: 400, offsetY: 150 },
      { componentName: "Valuation Analyst", offsetX: 400, offsetY: 500 },
      { componentName: "投资报告", offsetX: 800, offsetY: 0 },
    ],
    edges: [
      { source: "投资组合管理器", target: "Technical Analyst" },
      { source: "投资组合管理器", target: "Fundamentals Analyst" },
      { source: "投资组合管理器", target: "Sentiment Analyst" },
      { source: "投资组合管理器", target: "Valuation Analyst" },
      { source: "Technical Analyst", target: "投资报告" },
      { source: "Fundamentals Analyst", target: "投资报告" },
      { source: "Sentiment Analyst", target: "投资报告" },
      { source: "Valuation Analyst", target: "投资报告" },
    ],
  }
};

export function getMultiNodeDefinition(name: string): MultiNodeDefinition | null {
  return multiNodeDefinition[name] || null;
}

export function isMultiNodeComponent(componentName: string): boolean {
  return componentName in multiNodeDefinition;
}