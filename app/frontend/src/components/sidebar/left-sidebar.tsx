import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ComponentGroup, getComponentGroups } from '@/data/sidebar-components';
import { useComponentGroups } from '@/hooks/use-component-groups';
import { useResizable } from '@/hooks/use-resizable';
import { cn } from '@/lib/utils';
import { PanelLeft } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { SearchBox } from './search-box';
import { SidebarItemGroup } from './sidebar-item-group';

interface LeftSidebarProps {
  children?: ReactNode;
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onToggleCollapse: () => void;
}

export function LeftSidebar({
  isCollapsed,
  onToggleCollapse,
}: LeftSidebarProps) {
  // Use our custom hooks
  const { width, isDragging, elementRef, startResize } = useResizable();
  
  // State for loading component groups
  const [componentGroups, setComponentGroups] = useState<ComponentGroup[]>([]);
  
  // Load component groups on mount
  useEffect(() => {
    const loadComponentGroups = async () => {
      try {
        const groups = await getComponentGroups();
        setComponentGroups(groups);
      } catch (error) {
        console.error('Failed to load component groups:', error);
        // Optionally set fallback or show error state
      }
    };
    
    loadComponentGroups();
  }, []);
  
  const { 
    searchQuery, 
    setSearchQuery, 
    activeItem, 
    openGroups, 
    filteredGroups,
    handleAccordionChange 
  } = useComponentGroups(componentGroups);

  return (
    <div 
      ref={elementRef}
      className={cn(
        "h-full bg-ramp-grey-800 flex flex-col relative",
        isCollapsed ? "shadow-lg" : "",
        isDragging ? "select-none" : ""
      )}
      style={{ 
        width: `${width}px`,
        borderRight: isDragging ? 'none' : '1px solid var(--ramp-grey-900)' 
      }}
    >
      <div className="p-2 flex justify-between flex-shrink-0 items-center border-b border-ramp-grey-700 mt-4">
        <span className="text-white text-sm font-medium ml-4">Components</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-6 w-6 text-white hover:bg-ramp-grey-700"
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex-grow overflow-auto text-white scrollbar-thin scrollbar-thumb-ramp-grey-700">
        <SearchBox 
          value={searchQuery} 
          onChange={setSearchQuery} 
        />
        
        <Accordion 
          type="multiple" 
          className="w-full" 
          value={openGroups} 
          onValueChange={handleAccordionChange}
        >
          {filteredGroups.map(group => (
            <SidebarItemGroup
              key={group.name} 
              group={group}
              activeItem={activeItem}
            />
          ))}
        </Accordion>

        {filteredGroups.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No components match your search
          </div>
        )}
      </div>
      
      {/* Resize handle - completely hidden during dragging */}
      {!isDragging && (
        <div 
          className="absolute top-0 right-0 h-full w-1 cursor-ew-resize transition-all duration-150 z-10"
          onMouseDown={startResize}
        />
      )}
    </div>
  );
} 