// Conditionally renders the correct properties panel based on the
// application state (e.g., selection, active tool).
import React from 'react';
import { AppController } from '../../core/AppController';
import { ICanvasState } from '../../types/types';
import { SelectionPropertiesPanel } from './SelectionPropertiesPanel';
import { DrawingPropertiesPanel } from './DrawingPropertiesPanel';
import { CanvasPropertiesPanel } from './CanvasPropertiesPanel';

interface PropertiesContentProps {
    controller: AppController;
    modelState: ICanvasState;
}

export const PropertiesContent = ({ controller, modelState }: PropertiesContentProps) => {
    const { selection, activeTool } = modelState;
    const isDrawingToolActive = ['rect', 'ellipse', 'triangle', 'line', 'text', 'pencil', 'pen', 'stamp'].includes(activeTool);

    return (
        <div className="flex flex-col text-sm h-full">
            <div className="flex-1 overflow-y-auto p-2">
                <div className="flex flex-col gap-4 p-2">
                    {selection
                        ? <SelectionPropertiesPanel controller={controller} modelState={modelState} />
                        : isDrawingToolActive
                            ? <DrawingPropertiesPanel controller={controller} modelState={modelState} />
                            : <CanvasPropertiesPanel controller={controller} modelState={modelState} />}
                </div>
            </div>
        </div>
    );
};