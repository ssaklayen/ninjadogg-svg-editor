// A toolbar button with a flyout menu for selecting a shape tool (Rectangle, Ellipse, etc.).
import React from 'react';
import { Circle, Triangle, RectangleHorizontal, Minus, ChevronDown } from 'lucide-react';
import { AppController } from '../../core/AppController';
import { SetActiveToolCommand } from '../../patterns/command/implementations';
import { useFlyout } from '../../hooks/useFlyout';

interface ShapeToolButtonProps {
    controller: AppController;
    activeTool: string;
    lastSelectedShapeTool: string;
}

const shapeTools = [
    { name: 'rect', label: 'Rectangle / Square', icon: <RectangleHorizontal /> },
    { name: 'ellipse', label: 'Ellipse / Circle', icon: <Circle /> },
    { name: 'triangle', label: 'Triangle', icon: <Triangle /> },
    { name: 'line', label: 'Line', icon: <Minus /> },
];

export const ShapeToolButton = ({ controller, activeTool, lastSelectedShapeTool }: ShapeToolButtonProps) => {
    const { isOpen, setIsOpen, dropdownRef, getButtonProps } = useFlyout();

    const displayedShape = shapeTools.find(t => t.name === lastSelectedShapeTool) || shapeTools[0];
    const isShapeToolActive = shapeTools.some(t => t.name === activeTool);

    const handleToolSelect = (toolName: string) => {
        // PATTERN: Command - Executes a command to set the active tool.
        controller.executeCommand(SetActiveToolCommand, toolName, 'shape');
        setIsOpen(false);
    };

    const handleShortClick = () => {
        controller.executeCommand(SetActiveToolCommand, displayedShape.name);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                {...getButtonProps(handleShortClick)}
                className={`p-3 rounded-lg w-full flex justify-center items-center relative ${isShapeToolActive ? 'bg-accent-primary text-text-primary' : 'hover:bg-background-tertiary text-text-muted'}`}
                title={displayedShape.label}
            >
                {displayedShape.icon}
                <ChevronDown size={12} className="absolute bottom-1 right-1 text-text-primary opacity-75" />
            </button>

            {isOpen && (
                <div
                    className="absolute left-full top-0 ml-2 w-auto bg-background-secondary border border-border-primary rounded-lg shadow-lg z-30">
                    <div className="p-2 flex gap-2">
                        {shapeTools.map(tool => (
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