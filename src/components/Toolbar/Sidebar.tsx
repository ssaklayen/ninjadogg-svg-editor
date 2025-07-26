import React from 'react';
import { MousePointer2, Type } from 'lucide-react';
import { AppController } from '../../core/AppController';
import { ToolButton } from './ToolButton';
import { ShapeToolButton } from './ShapeToolButton';
import { DrawingToolButton } from './DrawingToolButton';
import { SetActiveToolCommand } from '../../patterns/command/implementations';
import { ICanvasState } from '../../types/types';
import { StampToolButton } from './StampToolButton';

interface SidebarProps {
    controller: AppController;
    modelState: ICanvasState;
}

export const Sidebar = ({ controller, modelState }: SidebarProps) => (
    <aside className="w-16 bg-background-primary flex-shrink-0 flex flex-col items-center p-2 gap-2 z-20 shadow-lg">
        <ToolButton icon={<MousePointer2 />} label="Select" toolName="select" activeTool={modelState.activeTool}
                    onClick={() => controller.executeCommandWithoutHistory(SetActiveToolCommand, 'select')} />
        <DrawingToolButton controller={controller} activeTool={modelState.activeTool} lastSelectedDrawingTool={modelState.lastSelectedDrawingTool} />
        <ShapeToolButton controller={controller} activeTool={modelState.activeTool} lastSelectedShapeTool={modelState.lastSelectedShapeTool} />
        <StampToolButton controller={controller} modelState={modelState} />
        <ToolButton icon={<Type />} label="Text" toolName="text" activeTool={modelState.activeTool}
                    onClick={() => controller.executeCommandWithoutHistory(SetActiveToolCommand, 'text')} />
    </aside>
);