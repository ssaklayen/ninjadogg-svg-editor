// FILE: src\components\Toolbar\DrawingToolButton.tsx
import React from 'react';
import { Pen, Pencil, ChevronDown } from 'lucide-react';
import { AppController } from '../../core/AppController';
import { SetActiveToolCommand } from '../../patterns/command/implementations';
import { useFlyout } from '../../hooks/useFlyout';

interface DrawingToolButtonProps {
    controller: AppController;
    activeTool: string;
    lastSelectedDrawingTool: string;
}

const drawingTools = [
    { name: 'pencil', label: 'Pencil (Freehand)', icon: <Pencil /> },
    { name: 'pen', label: 'Pen (Vertices)', icon: <Pen /> },
];

export const DrawingToolButton = ({ controller, activeTool, lastSelectedDrawingTool }: DrawingToolButtonProps) => {
    const { isOpen, setIsOpen, dropdownRef, getButtonProps } = useFlyout();

    const displayedDrawingTool = drawingTools.find(t => t.name === lastSelectedDrawingTool) || drawingTools[0];
    const isDrawingToolActive = drawingTools.some(t => t.name === activeTool);

    const handleToolSelect = (toolName: string) => {
        controller.executeCommandWithoutHistory(SetActiveToolCommand, toolName, 'drawing');
        setIsOpen(false);
    };

    const handleShortClick = () => {
        controller.executeCommandWithoutHistory(SetActiveToolCommand, displayedDrawingTool.name);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                {...getButtonProps(handleShortClick)}
                className={`p-3 rounded-lg w-full flex justify-center items-center relative ${isDrawingToolActive ? 'bg-accent-primary text-text-primary' : 'hover:bg-background-tertiary text-text-muted'}`}
                title={displayedDrawingTool.label}
            >
                {displayedDrawingTool.icon}
                <ChevronDown size={12} className="absolute bottom-1 right-1 text-text-primary opacity-75" />
            </button>

            {isOpen && (
                <div
                    className="absolute left-full top-0 ml-2 w-auto bg-background-secondary border border-border-primary rounded-lg shadow-lg z-30">
                    <div className="p-2 flex gap-2">
                        {drawingTools.map(tool => (
                            <button
                                key={tool.name}
                                onClick={() => handleToolSelect(tool.name)}
                                className={`p-3 rounded-lg flex justify-center items-center ${activeTool === tool.name ? 'bg-accent-primary text-text-primary' : 'hover:bg-background-tertiary text-text-muted'}`}
                                title={tool.label}
                            >
                                {tool.icon}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};