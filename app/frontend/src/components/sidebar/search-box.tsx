import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBox({ 
  value, 
  onChange, 
  placeholder = "搜索组件..." 
}: SearchBoxProps) {
  return (
    <div className="px-2 py-2 sticky top-0 bg-ramp-grey-800 z-10">
      <div className="flex items-center rounded-md bg-ramp-grey-700 px-3 py-1">
        <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
        <input 
          type="text" 
          placeholder={placeholder} 
          className="bg-transparent text-base md:text-sm focus:outline-none text-white w-full placeholder-gray-400 -webkit-appearance-none appearance-none touch-manipulation [color:white!important] [-webkit-text-fill-color:white!important] [background-color:transparent!important] [caret-color:white] focus:[color:white!important] focus:[-webkit-text-fill-color:white!important] focus:[background-color:transparent!important]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange('')}
            className="h-4 w-4 text-gray-400 hover:text-white"
            aria-label="清除搜索"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}