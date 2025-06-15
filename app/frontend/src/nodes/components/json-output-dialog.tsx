import { Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface JsonOutputDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  outputNodeData: any;
}

export function JsonOutputDialog({ 
  isOpen, 
  onOpenChange, 
  outputNodeData 
}: JsonOutputDialogProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const { toast } = useToast();

  if (!outputNodeData) return null;

  const jsonString = JSON.stringify(outputNodeData, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          variant: "success",
          title: "复制成功",
          description: "JSON数据已复制到剪贴板",
        });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({
          variant: "destructive",
          title: "复制失败",
          description: "无法复制到剪贴板，请手动复制",
        });
      });
  };

  const downloadJson = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `output-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
      toast({
        variant: "success",
        title: "下载成功",
        description: "JSON文件已保存到本地",
      });
    } catch (err) {
      console.error('Failed to download JSON: ', err);
      toast({
        variant: "destructive",
        title: "下载失败",
        description: "无法下载文件，请重试",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            JSON输出
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span className="font-medium">{copySuccess ? '已复制!' : '复制'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadJson}
                className="flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="font-medium">{downloadSuccess ? '已下载!' : '下载'}</span>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 my-4 overflow-auto rounded-md border border-border bg-muted/30">
          <SyntaxHighlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '0.75rem',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
            wrapLines={true}
            wrapLongLines={true}
          >
            {jsonString}
          </SyntaxHighlighter>
        </div>
      </DialogContent>
    </Dialog>
  );
}