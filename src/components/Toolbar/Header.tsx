import React, { useState, useEffect, useRef } from 'react';
import { FilePlus2, Save, Share2, FolderOpen, Redo, Undo, ZoomIn, ZoomOut, Grid as GridIcon, ChevronDown, Sun, Moon, BoxSelect } from 'lucide-react';
import { AppController } from '../../core/AppController';
import { ICanvasState } from '../../types/types';
import {
    OpenNewCanvasModalCommand, OpenSaveModalCommand, OpenExportModalCommand,
    OpenLoadModalCommand, ZoomCommand, ToggleGridCommand, SetGridColorCommand, ToggleThemeCommand, RenameProjectCommand, ToggleBorderVisibilityCommand, SetBorderColorCommand
} from '../../patterns/command/implementations';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from '../Panels/ColorPicker';

const GridColorFlyout = ({ controller, onclose }: { controller: AppController, onclose: () => void }) => {
    const flyoutRef = useRef<HTMLDivElement>(null);
    const { gridColor } = controller.model.getState();
    const { isOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(onclose);

    const presetColors = ['rgba(204, 204, 204, 0.5)', 'rgba(100, 100, 100, 0.5)', 'rgba(255, 100, 100, 0.5)', 'rgba(100, 100, 255, 0.5)'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node) && !pickerRef.current?.contains(event.target as Node)) {
                onclose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onclose, pickerRef]);

    const handleColorChange = (color: string) => {
        controller.executeCommandWithoutHistory(SetGridColorCommand, color);
    };

    return (
        <div ref={flyoutRef} className="absolute top-full mt-2 right-0 bg-background-secondary border border-border-primary rounded-lg shadow-xl z-50 p-3 w-48">
            <p className="text-xs text-text-muted mb-2 font-semibold">Grid Color</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
                {presetColors.map(color => (
                    <button key={color} onClick={() => handleColorChange(color)} className="w-8 h-8 rounded border-2 border-transparent hover:border-accent-secondary" style={{ backgroundColor: color }} />
                ))}
            </div>
            <div>
                <button ref={triggerRef} onClick={openPicker} className="w-full text-center text-xs bg-background-tertiary hover:bg-border-secondary py-1.5 rounded">
                    Custom Color
                </button>
                {isOpen && (
                    <ColorPicker
                        ref={pickerRef}
                        position={position}
                        initialColor={gridColor}
                        onChange={handleColorChange}
                        onClose={closePicker}
                    />
                )}
            </div>
        </div>
    );
};

const BorderColorFlyout = ({ controller, onclose }: { controller: AppController, onclose: () => void }) => {
    const flyoutRef = useRef<HTMLDivElement>(null);
    const { borderColor } = controller.model.getState();
    const { isOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(onclose);

    const presetColors = ['rgba(255, 255, 255, 0.8)', 'rgba(0, 0, 0, 0.8)', 'rgba(255, 100, 100, 0.8)', 'rgba(100, 100, 255, 0.8)'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node) && !pickerRef.current?.contains(event.target as Node)) {
                onclose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onclose, pickerRef]);

    const handleColorChange = (color: string) => {
        controller.executeCommandWithoutHistory(SetBorderColorCommand, color);
    };

    return (
        <div ref={flyoutRef} className="absolute top-full mt-2 right-0 bg-background-secondary border border-border-primary rounded-lg shadow-xl z-50 p-3 w-48">
            <p className="text-xs text-text-muted mb-2 font-semibold">Border Color</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
                {presetColors.map(color => (
                    <button key={color} onClick={() => handleColorChange(color)} className="w-8 h-8 rounded border-2 border-transparent hover:border-accent-secondary" style={{ backgroundColor: color }} />
                ))}
            </div>
            <div>
                <button ref={triggerRef} onClick={openPicker} className="w-full text-center text-xs bg-background-tertiary hover:bg-border-secondary py-1.5 rounded">
                    Custom Color
                </button>
                {isOpen && (
                    <ColorPicker
                        ref={pickerRef}
                        position={position}
                        initialColor={borderColor}
                        onChange={handleColorChange}
                        onClose={closePicker}
                    />
                )}
            </div>
        </div>
    );
};

export const Header = ({ controller, modelState }: HeaderProps) => {
    const { canUndo, canRedo, isGridVisible, isDirty, theme, projectName, isBorderVisible } = modelState;
    const [isGridFlyoutOpen, setGridFlyoutOpen] = useState(false);
    const [isBorderFlyoutOpen, setBorderFlyoutOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingName && inputRef.current) {
            inputRef.current.select();
        }
    }, [isEditingName]);

    const handleLoadClick = () => {
        if (isDirty) {
            controller.model.setState({
                isUnsavedChangesModalOpen: true,
                pendingAction: () => controller.executeCommandWithoutHistory(OpenLoadModalCommand)
            });
        } else {
            controller.executeCommandWithoutHistory(OpenLoadModalCommand);
        }
    };

    const handleNewCanvas = () => {
        if (isDirty) {
            controller.model.setState({
                isUnsavedChangesModalOpen: true,
                pendingAction: () => controller.executeCommand(OpenNewCanvasModalCommand)
            });
        } else {
            controller.executeCommand(OpenNewCanvasModalCommand);
        }
    };

    const handleNameChange = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
        controller.executeCommand(RenameProjectCommand, e.currentTarget.value);
        setIsEditingName(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNameChange(e);
        else if (e.key === 'Escape') setIsEditingName(false);
    };

    return (
        <header className="bg-background-primary shadow-md p-2 flex flex-col z-40">
            <div className="flex justify-center items-center w-full pb-2 mb-2 border-b border-border-primary">
                {isEditingName ? (
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={projectName}
                        onBlur={handleNameChange}
                        onKeyDown={handleNameKeyDown}
                        className="text-lg font-bold bg-transparent text-text-primary px-2 py-0.5 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        autoFocus
                    />
                ) : (
                    <h1 onDoubleClick={() => setIsEditingName(true)} className="text-lg font-bold text-accent-secondary p-0.5" title="Double-click to rename">
                        {projectName}
                    </h1>
                )}
            </div>

            <div className="flex items-center justify-center w-full">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button onClick={handleNewCanvas} className="p-2 rounded hover:bg-background-tertiary" title="New Canvas"><FilePlus2 size={20} /></button>
                        <button onClick={() => controller.executeCommandWithoutHistory(OpenSaveModalCommand)} className="p-2 rounded hover:bg-background-tertiary" title="Save Project"><Save size={20} /></button>
                        <button onClick={() => controller.executeCommandWithoutHistory(OpenExportModalCommand)} className="p-2 rounded hover:bg-background-tertiary" title="Export"><Share2 size={20} /></button>
                        <button onClick={handleLoadClick} className="p-2 rounded hover:bg-background-tertiary" title="Load File"><FolderOpen size={20} /></button>
                    </div>

                    <div className="h-6 border-l border-border-primary"></div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => controller.executeCommandWithoutHistory(ZoomCommand, 1.2)} className="p-2 rounded hover:bg-background-tertiary" title="Zoom In"><ZoomIn size={18} /></button>
                        <button onClick={() => controller.executeCommandWithoutHistory(ZoomCommand, 0.8)} className="p-2 rounded hover:bg-background-tertiary" title="Zoom Out"><ZoomOut size={18} /></button>

                        <div className="h-6 border-l border-border-primary"></div>

                        <div className="relative">
                            <div className={`flex items-center rounded-md ${isBorderVisible ? 'bg-accent-primary' : 'bg-background-secondary hover:bg-background-tertiary'}`}>
                                <button onClick={() => controller.executeCommandWithoutHistory(ToggleBorderVisibilityCommand)} className="p-2 rounded-l-md" title="Toggle Canvas Border">
                                    <BoxSelect size={18} />
                                </button>
                                <div className="w-px h-5 bg-border-secondary opacity-50"></div>
                                <button onClick={() => setBorderFlyoutOpen(!isBorderFlyoutOpen)} className="p-2 rounded-r-md" title="Border Options">
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            {isBorderFlyoutOpen && <BorderColorFlyout controller={controller} onclose={() => setBorderFlyoutOpen(false)} />}
                        </div>

                        <div className="relative">
                            <div className={`flex items-center rounded-md ${isGridVisible ? 'bg-accent-primary' : 'bg-background-secondary hover:bg-background-tertiary'}`}>
                                <button onClick={() => controller.executeCommandWithoutHistory(ToggleGridCommand)} className="p-2 rounded-l-md" title="Toggle Grid">
                                    <GridIcon size={18} />
                                </button>
                                <div className="w-px h-5 bg-border-secondary opacity-50"></div>
                                <button onClick={() => setGridFlyoutOpen(!isGridFlyoutOpen)} className="p-2 rounded-r-md" title="Grid Options">
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            {isGridFlyoutOpen && <GridColorFlyout controller={controller} onclose={() => setGridFlyoutOpen(false)} />}
                        </div>

                        <div className="h-6 border-l border-border-primary"></div>

                        <button onClick={controller.undo} disabled={!canUndo} className="p-2 rounded hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)"><Undo size={20} /></button>
                        <button onClick={controller.redo} disabled={!canRedo} className="p-2 rounded hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)"><Redo size={20} /></button>
                    </div>

                    <div className="h-6 border-l border-border-primary"></div>

                    <button
                        onClick={() => controller.executeCommandWithoutHistory(ToggleThemeCommand)}
                        className="p-2 rounded-full hover:bg-background-tertiary"
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </div>
        </header>
    );
};

interface HeaderProps {
    controller: AppController;
    modelState: ICanvasState;
}