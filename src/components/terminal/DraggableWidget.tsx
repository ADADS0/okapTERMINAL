"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Settings2, Maximize2, Minimize2, GripVertical, Move } from 'lucide-react';

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface DraggableWidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  position: WidgetPosition;
  onPositionChange: (id: string, position: Partial<WidgetPosition>) => void;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  minWidth?: number;
  minHeight?: number;
  showSettings?: boolean;
  onSettingsClick?: () => void;
  headerColor?: string;
  icon?: React.ReactNode;
}

export function DraggableWidget({
  id,
  title,
  children,
  position,
  onPositionChange,
  onClose,
  onFocus,
  minWidth = 250,
  minHeight = 200,
  showSettings = false,
  onSettingsClick,
  headerColor = 'bg-zinc-900',
  icon,
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevPosition, setPrevPosition] = useState<WidgetPosition | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    onFocus(id);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [id, position, onFocus, isMaximized]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(id);
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
      posX: position.x,
      posY: position.y,
    };
  }, [id, position, onFocus, isMaximized]);

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        onPositionChange(id, {
          x: Math.max(0, dragStartRef.current.posX + deltaX),
          y: Math.max(0, dragStartRef.current.posY + deltaY),
        });
      } else if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.posX;
        let newY = resizeStartRef.current.posY;

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(minWidth, resizeStartRef.current.width + deltaX);
        }
        if (resizeDirection.includes('w')) {
          const widthDelta = Math.min(deltaX, resizeStartRef.current.width - minWidth);
          newWidth = resizeStartRef.current.width - widthDelta;
          newX = resizeStartRef.current.posX + widthDelta;
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(minHeight, resizeStartRef.current.height + deltaY);
        }
        if (resizeDirection.includes('n')) {
          const heightDelta = Math.min(deltaY, resizeStartRef.current.height - minHeight);
          newHeight = resizeStartRef.current.height - heightDelta;
          newY = resizeStartRef.current.posY + heightDelta;
        }

        onPositionChange(id, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, resizeDirection, id, onPositionChange, minWidth, minHeight]);

  // Handle maximize/restore
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      if (prevPosition) {
        onPositionChange(id, prevPosition);
      }
      setIsMaximized(false);
    } else {
      setPrevPosition(position);
      const container = widgetRef.current?.parentElement;
      if (container) {
        onPositionChange(id, {
          x: 0,
          y: 0,
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
      setIsMaximized(true);
    }
  }, [isMaximized, prevPosition, position, id, onPositionChange]);

  const handleWidgetClick = useCallback(() => {
    onFocus(id);
  }, [id, onFocus]);

  // Resize handles
  const resizeHandles = [
    { direction: 'n', cursor: 'ns-resize', style: { top: 0, left: 4, right: 4, height: 4 } },
    { direction: 's', cursor: 'ns-resize', style: { bottom: 0, left: 4, right: 4, height: 4 } },
    { direction: 'e', cursor: 'ew-resize', style: { right: 0, top: 4, bottom: 4, width: 4 } },
    { direction: 'w', cursor: 'ew-resize', style: { left: 0, top: 4, bottom: 4, width: 4 } },
    { direction: 'ne', cursor: 'nesw-resize', style: { top: 0, right: 0, width: 8, height: 8 } },
    { direction: 'nw', cursor: 'nwse-resize', style: { top: 0, left: 0, width: 8, height: 8 } },
    { direction: 'se', cursor: 'nwse-resize', style: { bottom: 0, right: 0, width: 8, height: 8 } },
    { direction: 'sw', cursor: 'nesw-resize', style: { bottom: 0, left: 0, width: 8, height: 8 } },
  ];

  return (
    <div
      ref={widgetRef}
      className={`absolute flex flex-col rounded-lg overflow-hidden border border-zinc-700/80 shadow-2xl ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        zIndex: position.zIndex,
      }}
      onClick={handleWidgetClick}
    >
      {/* Header */}
      <div
        className={`h-8 ${headerColor} border-b border-zinc-700/80 flex items-center justify-between px-2 shrink-0 select-none`}
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-zinc-500" />
          {icon && <span className="text-zinc-400">{icon}</span>}
          <span className="text-xs font-medium text-zinc-300 truncate max-w-[180px]">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {showSettings && onSettingsClick && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleMaximize(); }}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
          >
            {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(id); }}
            className="p-1 hover:bg-red-600/80 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[#0c0c0e]">
        {children}
      </div>

      {/* Resize handles */}
      {!isMaximized && resizeHandles.map(({ direction, cursor, style }) => (
        <div
          key={direction}
          className="absolute z-10 opacity-0 hover:opacity-100"
          style={{ ...style, cursor }}
          onMouseDown={(e) => handleResizeStart(e, direction)}
        />
      ))}

      {/* Corner resize indicator */}
      {!isMaximized && (
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize">
          <svg className="w-3 h-3 text-zinc-600" viewBox="0 0 12 12" fill="currentColor">
            <path d="M11 11H9V9h2v2zm0-4H9V5h2v2zm-4 4H5V9h2v2z" />
          </svg>
        </div>
      )}
    </div>
  );
}
