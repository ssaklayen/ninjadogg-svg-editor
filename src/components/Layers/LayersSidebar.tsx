// This component renders the collapsible sidebar that contains the main LayersPanel.
// It provides the top-level controls for adding new layers and toggling the sidebar's visibility.
import React from 'react';
import { AppController } from '../../core/AppController';
import { ICanvasState } from '../../types/types';
import { LayersPanel } from './LayersPanel';
import { ChevronRight, ChevronLeft, Layers, Plus } from 'lucide-react';
import { AddLayerCommand } from '../../patterns/command/implementations';

interface LayersSidebarProps {
    controller: AppController;
    modelState: ICanvasState;
    isExpanded: boolean;
    onToggle: () => void;
}

// The main sidebar component for layer management.
// @param controller - The main application controller.
// @param modelState - The current state from the model.
// @param isExpanded - Whether the sidebar is currently expanded.
// @param onToggle - Callback to toggle the sidebar's expanded state.
export const LayersSidebar = ({ controller, modelState, isExpanded, onToggle }: LayersSidebarProps) => {

    return (
        <div className={`relative bg-background-primary flex flex-shrink-0 z-10`}>
            <button
                onClick={onToggle}
                className="absolute top-1/2 -left-3 -translate-y-1/2 bg-background-tertiary hover:bg-accent-primary text-text-primary p-1 rounded-full z-20"
                title={isExpanded ? "Collapse Layers" : "Expand Layers"}
            >
                {isExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <div className={`transition-[width] duration-300 ease-in-out overflow-hidden ${isExpanded ? 'w-72' : 'w-8'}`}>
                <div className={`w-72 h-full flex flex-col transition-opacity duration-200 ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                    <div draggable="false" className="flex items-center justify-between gap-3 p-2 border-b border-border-primary">
                        <div className="flex items-center gap-3">
                            <div draggable="false" className="text-accent-secondary"><Layers size={18} /></div>
                            <h2 className="text-md font-semibold text-text-primary select-none">Layers</h2>
                            <button
                                // PATTERN: Command - Executes the AddLayerCommand.
                                onClick={() => controller.executeCommand(AddLayerCommand)}
                                className="p-1 text-text-muted hover:text-text-primary hover:bg-background-tertiary rounded-md"
                                title="New Layer"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-y-auto p-4 flex-1">
                        <LayersPanel layers={modelState.layers} activeLayerId={modelState.activeLayerId} controller={controller} />
                    </div>
                </div>
            </div>
        </div>
    );
};