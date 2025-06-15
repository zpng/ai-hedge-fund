import { SidebarProvider } from '@/components/ui/sidebar';
import { FlowProvider } from '@/contexts/flow-context';
import { cn } from '@/lib/utils';
import { ReactFlowProvider } from '@xyflow/react';
import { PanelLeft, HelpCircle } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { LeftSidebar } from './sidebar/left-sidebar';
import { Button } from './ui/button';

type LayoutProps = {
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  children: ReactNode;
};

export function Layout({ leftSidebar, rightSidebar, children }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <div className="flex h-screen w-screen overflow-hidden relative bg-background">
        <ReactFlowProvider>
          <FlowProvider>
            {/* Main content area takes full width */}
            <main className="flex-1 h-full overflow-hidden w-full">
              {children}
            </main>

            {/* Floating left sidebar */}
            <div className={cn(
              "absolute top-0 left-0 z-30 h-full transition-transform",
              isCollapsed && "transform -translate-x-full opacity-0"
            )}>
              <LeftSidebar
                isCollapsed={isCollapsed}
                onCollapse={() => setIsCollapsed(true)}
                onExpand={() => setIsCollapsed(false)}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
              >
                {leftSidebar}
              </LeftSidebar>
            </div>

            {/* Sidebar toggle button - visible when sidebar is collapsed */}
            {isCollapsed && (
              <Button 
                className="absolute top-4 left-4 z-30 bg-ramp-grey-800 text-white p-4 rounded-md hover:bg-ramp-grey-700"
                onClick={() => setIsCollapsed(false)}
                aria-label="显示侧边栏"
              >
                组件 <PanelLeft size={16} />
              </Button>
            )}

            {/* Help documentation button - always visible in top right */}
            <button
               onClick={() => {
                 navigator.clipboard.writeText('992562811').then(() => {
                   alert('QQ群号已复制到剪贴板：992562811');
                 }).catch(() => {
                   alert('复制失败，QQ群号：992562811');
                 });
               }}
               className="px-3 py-2 bg-white/80 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg hover:bg-white/90 transition-all duration-200 text-sm font-medium text-gray-600 hover:text-blue-600 absolute top-4 right-4 z-30 cursor-pointer"
               title="点击复制QQ群号：992562811"
             >
               QQ群：992562811
             </button>

            {/* Right sidebar */}
            {rightSidebar && (
              <div className="h-full w-64 bg-gray-900 border-l border-gray-800 ml-auto flex-shrink-0">
                {rightSidebar}
              </div>
            )}
          </FlowProvider>
        </ReactFlowProvider>
      </div>
    </SidebarProvider>
  );
}