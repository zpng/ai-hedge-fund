import { useState } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {Badge} from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {ArrowDown, ArrowUp, Minus, Download} from 'lucide-react';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '@/hooks/use-toast';

interface InvestmentReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    outputNodeData: any;
}

type ActionType = 'long' | 'short' | 'hold';

export function InvestmentReportDialog({
                                           isOpen,
                                           onOpenChange,
                                           outputNodeData
                                       }: InvestmentReportDialogProps) {
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const { toast } = useToast();
    
    if (!outputNodeData) return null;

    const getActionIcon = (action: ActionType) => {
        switch (action) {
            case 'long':
                return <ArrowUp className="h-4 w-4 text-green-500"/>;
            case 'short':
                return <ArrowDown className="h-4 w-4 text-red-500"/>;
            case 'hold':
                return <Minus className="h-4 w-4 text-yellow-500"/>;
            default:
                return null;
        }
    };

    const getSignalBadge = (signal: string) => {
        const variant = signal === 'bullish' ? 'success' :
            signal === 'bearish' ? 'destructive' : 'outline';

        const signalText = signal === 'bullish' ? '看涨' :
            signal === 'bearish' ? '看跌' :
                signal === 'neutral' ? '中立' : signal;

        return (
            <Badge variant={variant as any}>
                {signalText}
            </Badge>
        );
    };

    const getConfidenceBadge = (confidence: number) => {
        let variant = 'outline';
        if (confidence >= 50) variant = 'success';
        else if (confidence >= 0) variant = 'warning';
        else variant = 'outline';
        const rounded = Number(confidence.toFixed(1));
        return (
            <Badge variant={variant as any}>
                {rounded}%
            </Badge>
        );
    };

    // Extract unique tickers from the data
    const tickers = Object.keys(outputNodeData.decisions || {});

    // Extract unique agents from analyst signals, excluding risk_management_agent
    const agents = Object.keys(outputNodeData.analyst_signals || {})
        .filter(agent => agent !== 'risk_management_agent');

    // Agent name mapping from English to Chinese
    const getAgentDisplayName = (agentKey: string) => {
        const agentNameMap: { [key: string]: string } = {
            'fundamentals_analyst_agent': '基本面分析师',
            'technical_analyst_agent': '技术分析师',
            'sentiment_agent': '情绪分析师',
            'valuation_analyst_agent': '估值分析师',
            'warren_buffett_agent': '沃伦·巴菲特分析师',
            'peter_lynch_agent': '彼得·林奇分析师',
            'ben_graham_agent': '本杰明·格雷厄姆分析师',
            'phil_fisher_agent': '菲利普·费雪分析师',
            'charlie_munger_agent': '查理·芒格分析师',
            'bill_ackman_agent': '比尔·阿克曼分析师',
            'michael_burry_agent': '迈克尔·伯里分析师',
            'cathie_wood_agent': '凯西·伍德分析师',
            'stanley_druckenmiller_agent': '斯坦利·德鲁肯米勒分析师',
            'aswath_damodaran_agent': '阿斯瓦斯·达莫达兰分析师',
            'rakesh_jhunjhunwala_agent': '拉凯什·朱恩朱恩瓦拉分析师',
            'risk_management_agent': '风险管理分析师'
        };
        return agentNameMap[agentKey] || agentKey.replace(/_/g, ' ');
    };

    const downloadReport = async () => {
        try {
            // 创建一个临时的Canvas来生成长图片
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('无法创建Canvas上下文');

            // 设置Canvas尺寸 - 长图片格式
            const width = 800;
            const padding = 40;
            const lineHeight = 30;
            const sectionSpacing = 40;
            
            // 先计算所需的总高度
            let totalHeight = 100; // 标题和时间戳
            totalHeight += 60; // 摘要标题
            totalHeight += 30 + (tickers.length * 25); // 表格
            totalHeight += sectionSpacing;
            totalHeight += 40; // 分析师信号标题
            
            // 计算分析师信号部分的高度
            tickers.forEach(ticker => {
                totalHeight += 30; // 股票标题
                agents.forEach(agent => {
                    const signal = outputNodeData.analyst_signals[agent]?.[ticker];
                    if (signal) {
                        totalHeight += 20; // 分析师名称
                        totalHeight += 20; // 信号和置信度
                        
                        // 推理内容行数
                        const reasoning = typeof signal.reasoning === 'string' ? 
                            signal.reasoning : JSON.stringify(signal.reasoning);
                        const maxChars = 100;
                        const lines = Math.min(3, Math.ceil(reasoning.length / maxChars));
                        totalHeight += lines * 16 + 10;
                    }
                });
                totalHeight += 20;
            });
            
            totalHeight += 40; // 底部边距
            
            // 设置Canvas尺寸
            canvas.width = width;
            canvas.height = totalHeight;
            
            // 绘制函数
            const drawReport = () => {
                // 设置背景
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, totalHeight);
                
                let y = 40;
                
                // 标题
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 24px Arial, sans-serif';
                ctx.fillText('投资报告', padding, y);
                y += lineHeight + 10;
                
                // 时间戳
                ctx.font = '14px Arial, sans-serif';
                ctx.fillStyle = '#6b7280';
                ctx.fillText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, padding, y);
                y += sectionSpacing;
                
                // 摘要部分
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 18px Arial, sans-serif';
                ctx.fillText('投资决策摘要', padding, y);
                y += lineHeight;
                
                // 绘制表格头
                const colWidths = [80, 80, 80, 60, 80, 200];
                const headers = ['股票代码', '价格', '操作', '数量', '置信度', '理由'];
                let x = padding;
                
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(padding, y - 5, width - padding * 2, 25);
                
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 12px Arial, sans-serif';
                headers.forEach((header, i) => {
                    ctx.fillText(header, x, y + 15);
                    x += colWidths[i];
                });
                y += 30;
                
                // 绘制数据行
                ctx.font = '12px Arial, sans-serif';
                tickers.forEach((ticker, index) => {
                    const decision = outputNodeData.decisions[ticker];
                    const currentPrice = outputNodeData.analyst_signals.risk_management_agent?.[ticker]?.current_price || 'N/A';
                    
                    // 交替行背景色
                    if (index % 2 === 0) {
                        ctx.fillStyle = '#f9fafb';
                        ctx.fillRect(padding, y - 5, width - padding * 2, 25);
                    }
                    
                    ctx.fillStyle = '#1f2937';
                    x = padding;
                    
                    const rowData = [
                        ticker,
                        typeof currentPrice === 'number' ? `$${currentPrice.toFixed(2)}` : currentPrice,
                        decision.action === 'buy' ? '买入' : 
                         decision.action === 'sell' ? '卖出' : 
                         decision.action === 'hold' ? '持有' : 
                         decision.action === 'long' ? '做多' : 
                         decision.action === 'short' ? '做空' : decision.action,
                        decision.quantity.toString(),
                        `${decision.confidence.toFixed(1)}%`,
                        typeof decision.reasoning === 'string' ? 
                            decision.reasoning.substring(0, 50) + (decision.reasoning.length > 50 ? '...' : '') :
                            'JSON数据'
                    ];
                    
                    rowData.forEach((data, i) => {
                        ctx.fillText(data, x, y + 15);
                        x += colWidths[i];
                    });
                    y += 25;
                });
                
                y += sectionSpacing;
                
                // 分析师信号部分
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 18px Arial, sans-serif';
                ctx.fillText('分析师信号详情', padding, y);
                y += lineHeight + 10;
                
                tickers.forEach(ticker => {
                    ctx.font = 'bold 16px Arial, sans-serif';
                    ctx.fillStyle = '#1f2937';
                    const actionText = outputNodeData.decisions[ticker].action === 'buy' ? '买入' : 
                        outputNodeData.decisions[ticker].action === 'sell' ? '卖出' : 
                        outputNodeData.decisions[ticker].action === 'hold' ? '持有' : 
                        outputNodeData.decisions[ticker].action === 'long' ? '做多' : 
                        outputNodeData.decisions[ticker].action === 'short' ? '做空' : 
                        outputNodeData.decisions[ticker].action;
                    ctx.fillText(`${ticker} - ${actionText}`, padding, y);
                    y += lineHeight;
                    
                    agents.forEach(agent => {
                        const signal = outputNodeData.analyst_signals[agent]?.[ticker];
                        if (!signal) return;
                        
                        ctx.font = 'bold 14px Arial, sans-serif';
                        ctx.fillStyle = '#374151';
                        ctx.fillText(`${getAgentDisplayName(agent)}:`, padding + 20, y);
                        y += 20;
                        
                        ctx.font = '12px Arial, sans-serif';
                        ctx.fillStyle = '#6b7280';
                        
                        // 信号和置信度
                        const signalText = signal.signal === 'bullish' ? '看涨' :
                            signal.signal === 'bearish' ? '看跌' :
                            signal.signal === 'neutral' ? '中立' : signal.signal;
                        ctx.fillText(`信号: ${signalText} | 置信度: ${signal.confidence.toFixed(1)}%`, padding + 40, y);
                        y += 20;
                        
                        // 推理内容（截取前300字符，分行显示）
                        const reasoning = typeof signal.reasoning === 'string' ? 
                            signal.reasoning : JSON.stringify(signal.reasoning);
                        const maxChars = 100;
                        const lines = [];
                        for (let i = 0; i < reasoning.length; i += maxChars) {
                            lines.push(reasoning.substring(i, i + maxChars));
                            if (lines.length >= 3) break; // 最多显示3行
                        }
                        
                        lines.forEach(line => {
                            ctx.fillText(line, padding + 40, y);
                            y += 16;
                        });
                        y += 10;
                    });
                    y += 20;
                });
            };
            
            // 执行绘制
            drawReport();
            
            // 转换为图片并下载
            canvas.toBlob((blob) => {
                if (!blob) throw new Error('无法生成图片');
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `investment-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                setDownloadSuccess(true);
                setTimeout(() => setDownloadSuccess(false), 2000);
                toast({
                    variant: "success",
                    title: "下载成功",
                    description: "投资报告长图已保存到本地",
                });
            }, 'image/png');
            
        } catch (err) {
            console.error('Failed to download report: ', err);
            toast({
                variant: "destructive",
                title: "下载失败",
                description: "无法生成图片，请重试",
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center justify-between">
                        投资报告
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadReport}
                            className="flex items-center gap-1.5"
                        >
                            <Download className="h-4 w-4" />
                            <span className="font-medium">{downloadSuccess ? '已下载!' : '下载报告'}</span>
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-8 my-4">
                    {/* Summary Section */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4">摘要</h2>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>
                                    基于分析师信号的推荐交易操作
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>股票代码</TableHead>
                                            <TableHead>价格</TableHead>
                                            <TableHead>操作</TableHead>
                                            <TableHead>数量</TableHead>
                                            <TableHead>置信度</TableHead>
                                            <TableHead>理由</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tickers.map(ticker => {
                                            const decision = outputNodeData.decisions[ticker];
                                            const currentPrice = outputNodeData.analyst_signals.risk_management_agent?.[ticker]?.current_price || 'N/A';
                                            return (
                                                <TableRow key={ticker}>
                                                    <TableCell className="font-medium">{ticker}</TableCell>
                                                    <TableCell>${typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getActionIcon(decision.action as ActionType)}
                                                            <span className="capitalize">
                                                                {decision.action === 'buy' ? '买入' : 
                                                                 decision.action === 'sell' ? '卖出' : 
                                                                 decision.action === 'hold' ? '持有' : 
                                                                 decision.action === 'long' ? '做多' : 
                                                                 decision.action === 'short' ? '做空' : 
                                                                 decision.action}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{decision.quantity}</TableCell>
                                                    <TableCell>{getConfidenceBadge(decision.confidence)}</TableCell>
                                                    <TableCell className="max-w-sm">
                                                        {typeof decision.reasoning === 'string' ? (
                                                            <p className="text-xs text-muted-foreground hover:line-clamp-none">
                                                                {decision.reasoning}
                                                            </p>
                                                        ) : (
                                                            <div className="max-h-32 overflow-y-auto">
                                                                <SyntaxHighlighter
                                                                    language="json"
                                                                    style={vscDarkPlus}
                                                                    className="text-xs rounded-md"
                                                                    customStyle={{
                                                                        fontSize: '0.75rem',
                                                                        margin: 0,
                                                                        padding: '8px',
                                                                        backgroundColor: 'hsl(var(--muted))',
                                                                    }}
                                                                >
                                                                    {JSON.stringify(decision.reasoning, null, 2)}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </section>
                    {/* Analyst Signals Section */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4">分析师信号</h2>
                        <Accordion type="multiple" defaultValue={tickers.length > 0 ? [tickers[0]] : []}
                                   className="w-full">
                            {tickers.map(ticker => (
                                <AccordionItem key={ticker} value={ticker}>
                                    <AccordionTrigger
                                        className="text-base font-medium px-4 py-3 bg-muted/30 rounded-md hover:bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            {ticker}
                                            <div className="flex items-center gap-1">
                                                {getActionIcon(outputNodeData.decisions[ticker].action as ActionType)}
                                                <span className="text-sm font-normal text-muted-foreground">
                          {outputNodeData.decisions[ticker].action === 'buy' ? '买入' : 
                           outputNodeData.decisions[ticker].action === 'sell' ? '卖出' : 
                           outputNodeData.decisions[ticker].action === 'hold' ? '持有' : 
                           outputNodeData.decisions[ticker].action === 'long' ? '做多' : 
                           outputNodeData.decisions[ticker].action === 'short' ? '做空' : 
                           outputNodeData.decisions[ticker].action} {outputNodeData.decisions[ticker].quantity} 股
                        </span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 px-1">
                                        <div className="space-y-4">
                                            {/* Agent Signals */}
                                            <div className="grid grid-cols-1 gap-4">
                                                {agents.map(agent => {
                                                    const signal = outputNodeData.analyst_signals[agent]?.[ticker];
                                                    if (!signal) return null;

                                                    return (
                                                        <Card key={agent} className="overflow-hidden">
                                                            <CardHeader className="bg-muted/50 pb-3">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="text-base">
                                                                        {getAgentDisplayName(agent)}
                                                                    </CardTitle>
                                                                    <div className="flex items-center gap-2">
                                                                        {getSignalBadge(signal.signal)}
                                                                        {getConfidenceBadge(signal.confidence)}
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="pt-3">
                                                                {typeof signal.reasoning === 'string' ? (
                                                                    <p className="text-sm whitespace-pre-line">
                                                                        {signal.reasoning}
                                                                    </p>
                                                                ) : (
                                                                    <div
                                                                        className="max-h-48 overflow-y-auto bg-muted/30">
                                                                        <SyntaxHighlighter
                                                                            language="json"
                                                                            style={vscDarkPlus}
                                                                            className="text-sm rounded-md"
                                                                            customStyle={{
                                                                                fontSize: '0.875rem',
                                                                                margin: 0,
                                                                                padding: '12px',
                                                                                backgroundColor: 'hsl(var(--muted))',
                                                                            }}
                                                                        >
                                                                            {JSON.stringify(signal.reasoning, null, 2)}
                                                                        </SyntaxHighlighter>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}