import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {Badge} from '@/components/ui/badge';
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
import {ArrowDown, ArrowUp, Minus} from 'lucide-react';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism';

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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Investment Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-8 my-4">
                    {/* Summary Section */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4">Summary</h2>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>
                                    Recommended trading actions based on analyst signals
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ticker</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Confidence</TableHead>
                                            <TableHead>Reasoning</TableHead>
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
                                                            <span className="capitalize">{decision.action}</span>
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
                        <h2 className="text-lg font-semibold mb-4">Analyst Signals</h2>
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
                          {outputNodeData.decisions[ticker].action} {outputNodeData.decisions[ticker].quantity} shares
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
                                                                    <CardTitle className="text-base capitalize">
                                                                        {agent.replace(/_/g, ' ')}
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