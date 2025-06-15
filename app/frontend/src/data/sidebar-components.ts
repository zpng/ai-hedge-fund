import {
  BadgeDollarSign,
  Bot,
  Brain,
  Calculator,
  FileJson,
  FileText,
  LucideIcon,
  Network,
  Play,
  StopCircle
} from 'lucide-react';
import { Agent, getAgents } from './agents';

// Define component items by group
export interface ComponentItem {
  name: string;
  icon: LucideIcon;
}

export interface ComponentGroup {
  name: string;
  icon: LucideIcon;
  iconColor: string;
  items: ComponentItem[];
}

/**
 * Get all component groups, including agents fetched from the backend
 */
export const getComponentGroups = async (): Promise<ComponentGroup[]> => {
  const agents = await getAgents();
  
  return [
    {
      name: "起始节点",
      icon: Play,
      iconColor: "text-blue-400",
      items: [
        // { name: "聊天输入", icon: MessageSquare },
        { name: "投资组合管理器", icon: Brain },
        // { name: "文件输入", icon: FileText }
      ]
    },
    {
      name: "智能分析师",
      icon: Bot,
      iconColor: "text-red-400",
      items: agents.map((agent: Agent) => ({
        name: agent.display_name,
        icon: Bot
      }))
    },
    {
      name: "分析团队",
      icon: Network,
      iconColor: "text-yellow-400",
      items: [
        { name: "数据分析团队", icon: Calculator },
        { name: "价值投资团队", icon: BadgeDollarSign },
      ]
    },
    {
      name: "输出节点",
      icon: StopCircle,
      iconColor: "text-green-400",
      items: [
        { name: "JSON输出", icon: FileJson },
        { name: "投资报告", icon: FileText },
      ]
    },
  ];
};