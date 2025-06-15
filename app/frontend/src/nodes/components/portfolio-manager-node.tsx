import { ModelSelector } from '@/components/ui/llm-selector';
import { getConnectedEdges, useReactFlow, type NodeProps } from '@xyflow/react';
import { Brain, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNodeContext } from '@/contexts/node-context';
import { getDefaultModel, getModels, LanguageModel } from '@/data/models';
import { api } from '@/services/api';
import { type PortfolioManagerNode } from '../types';
import { NodeShell } from './node-shell';

export function PortfolioManagerNode({
  data,
  selected,
  id,
  isConnectable,
}: NodeProps<PortfolioManagerNode>) {
  const [tickers, setTickers] = useState('NVDA');
  const [selectedModel, setSelectedModel] = useState<LanguageModel | null>(null);
  const [availableModels, setAvailableModels] = useState<LanguageModel[]>([]);
  
  // Calculate default dates
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  
  const [startDate, setStartDate] = useState(threeMonthsAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const nodeContext = useNodeContext();
  const { resetAllNodes, agentNodeData } = nodeContext;
  const { getNodes, getEdges } = useReactFlow();
  const abortControllerRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  // Check if any agent is in progress
  const isProcessing = Object.values(agentNodeData).some(
    agent => agent.status === 'IN_PROGRESS'
  );
  
  // Load models and set default on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const [models, defaultModel] = await Promise.all([
          getModels(),
          getDefaultModel()
        ]);
        setAvailableModels(models);
        setSelectedModel(defaultModel);
      } catch (error) {
        console.error('Failed to load models:', error);
        // Keep empty array and null as fallback
      }
    };

    loadModels();
  }, []);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current();
      }
    };
  }, []);
  
  const handleTickersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTickers(e.target.value);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }
    // Reset all node data states
    resetAllNodes();
  };

  const handlePlay = () => {
      // Validate input
      if (!tickers.trim()) {
          toast({
              variant: "destructive",
              title: "输入错误",
              description: "请输入股票代码",
          });
          return;
      }
    // First, reset all nodes to IDLE
    resetAllNodes();
    
    // Clean up any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current();
    }
    
    // Call the backend API with SSE
    const tickerList = tickers.split(',').map(t => t.trim());
    
    // Get the nodes and edges
    const nodes = getNodes();
    const edges = getEdges();
    const connectedEdges = getConnectedEdges(nodes, edges);
    
    // Get all nodes that are agents and are connected in the flow
    const selectedAgents = new Set<string>();
    
    // First, collect all the target node IDs from connected edges
    const connectedNodeIds = new Set<string>();
    connectedEdges.forEach(edge => {
      if (edge.source === id) {
        connectedNodeIds.add(edge.target);
      }
    });
    
    // Then filter for nodes that are agents
    nodes.forEach(node => {
      if (node.type === 'agent-node' && connectedNodeIds.has(node.id)) {
        selectedAgents.add(node.id);
      }
    });
      // Check if any agents are connected
      if (selectedAgents.size === 0) {
          toast({
              variant: "destructive",
              title: "连接错误",
              description: "请连接至少一个分析师节点",
          });
          return;
      }

    // Collect agent models from connected agent nodes
    const agentModels = [];
    const allAgentModels = nodeContext.getAllAgentModels();
    for (const agentId of selectedAgents) {
      const model = allAgentModels[agentId];
      if (model) {
        agentModels.push({
          agent_id: agentId,
          model_name: model.model_name,
          model_provider: model.provider as any
        });
      }
    }
        
    abortControllerRef.current = api.runHedgeFund(
      {
        tickers: tickerList,
        selected_agents: Array.from(selectedAgents),
        agent_models: agentModels,
        // Keep global model for backwards compatibility (will be removed later)
        model_name: selectedModel?.model_name || undefined,
        model_provider: selectedModel?.provider as any || undefined,
        start_date: startDate,
        end_date: endDate,
      },
      // Pass the node status context to the API
      nodeContext
    );
  };

  return (
    <TooltipProvider>
      <NodeShell
        id={id}
        selected={selected}
        isConnectable={isConnectable}
        icon={<Brain className="h-5 w-5" />}
        name={data.name || "Portfolio Manager"}
        description={data.description}
        hasLeftHandle={false}
      >
        <CardContent className="p-0">
          <div className="border-t border-border p-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-subtitle text-muted-foreground flex items-center gap-1">
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span>股票代码</span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      You can add multiple tickers using commas (AAPL,NVDA,TSLA)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter tickers"
                    value={tickers}
                    onChange={handleTickersChange}
                  />
                  <Button 
                    className="flex-shrink-0 transition-all duration-200 bg-green-600 hover:bg-green-700 text-white active:scale-95 px-3 py-2 h-auto min-w-fit"
                    onClick={isProcessing ? handleStop : handlePlay}
                    disabled={!isProcessing && !tickers.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <Square className="h-3.5 w-3.5 mr-1" />
                        停止分析
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1" />
                        开始分析
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-subtitle text-muted-foreground flex items-center gap-1">
                  模型
                </div>
                <ModelSelector
                  models={availableModels}
                  value={selectedModel?.model_name || ""}
                  onChange={setSelectedModel}
                  placeholder="Select a model..."
                />
              </div>
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="!text-subtitle text-muted-foreground">
                    高级设置
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="text-subtitle text-muted-foreground flex items-center gap-1">
                          End Date
                        </div>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={handleEndDateChange}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="text-subtitle text-muted-foreground flex items-center gap-1">
                          Start Date
                        </div>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={handleStartDateChange}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </CardContent>
      </NodeShell>
    </TooltipProvider>
  );
}
