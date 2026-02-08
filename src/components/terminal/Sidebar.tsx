"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  MousePointer2,
  Minus,
  Square,
  GitBranch,
  Ruler,
  Type,
  Layers,
  Eraser,
  TrendingUp,
  ChevronLeft,
  Circle,
  PenTool,
} from 'lucide-react';

interface SidebarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  collapsed: boolean;
  onCollapse: () => void;
}

const tools = [
  { id: 'cursor', icon: MousePointer2, label: 'Cursor' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'trend', icon: TrendingUp, label: 'Trend Line' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'fib', icon: GitBranch, label: 'Fibonacci' },
  { id: 'ruler', icon: Ruler, label: 'Measure' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'draw', icon: PenTool, label: 'Draw' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'layers', icon: Layers, label: 'Layers' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

export function Sidebar({ activeTool, onToolChange, collapsed, onCollapse }: SidebarProps) {
  return (
    <TooltipProvider>
      <div className="w-10 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 gap-0.5">
        {tools.map((tool) => (
          <Tooltip key={tool.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className={`w-8 h-8 ${
                  activeTool === tool.id
                    ? 'bg-zinc-700 text-cyan-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                onClick={() => onToolChange(tool.id)}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {tool.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="flex-1" />

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
              onClick={onCollapse}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand' : 'Collapse'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
