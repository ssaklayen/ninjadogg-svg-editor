/**
 * Ninja Dogg SVG Editor
 *
 * This is the main root component for the application. It orchestrates the overall UI layout,
 * including the Header, Sidebars, and the main Canvas area. It initializes the AppController
 * and acts as an Observer to the central CanvasModel, re-rendering the UI when the state changes.
 * It also handles global keyboard shortcuts and other window-level events.
 */
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { AppController } from './core/AppController';
import { NewCanvasModal } from './components/Modal/NewCanvasModal';
import { SaveProjectModal } from './components/Modal/SaveProjectModal';
import { ExportModal } from './components/Modal/ExportModal';
import { LoadModal } from './components/Modal/LoadModal';
import { UnsavedChangesModal } from './components/Modal/UnsavedChangesModal';
import { Header } from './components/Toolbar/Header';
import { Sidebar } from './components/Toolbar/Sidebar';
import { LayersSidebar } from './components/Layers/LayersSidebar';
import { Canvas as CanvasComponent } from './components/Canvas/Canvas';
import { ContextMenu } from './components/ContextMenu/ContextMenu';
import { ICanvasState, IObserver } from './types/types';
import { DeleteSelectedCommand, CopyCommand, CutCommand, PasteCommand, ShowContextMenuCommand } from './patterns/command/implementations';
import { PropertiesSlider } from './components/Properties/PropertiesSlider';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// PATTERN: Singleton
// The AppController is a singleton to ensure a single source of control for the application's logic.
const controller = AppController.getInstance();

/**
 * The main application component.
 * Serves as the primary View in the MVC architecture.
 */
export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [modelState, setModelState] = useState<ICanvasState>(controller.model.getState());
    const [isPropertiesPanelExpanded, setPropertiesPanelExpanded] = useState(window.innerWidth >= 1024);
    const [isLayersPanelExpanded, setLayersPanelExpanded] = useState(window.innerWidth >= 1024);

    // Initializes the Fabric.js canvas via the controller once the view is ready.
    useLayoutEffect(() => {
        if (!modelState.isModalOpen && canvasRef.current && !controller.fabricCanvas) {
            controller.init(canvasRef.current);
        }
    }, [modelState.isModalOpen]);

    // Subscribes this component to the model, making it an Observer.
    // Any state change in the model will trigger a re-render.
    useEffect(() => {
        // PATTERN: Observer
        // The App component acts as an Observer, updating its state whenever the CanvasModel notifies it of changes.
        const observer: IObserver = {
            update: (newState: ICanvasState) => {
                setModelState(newState);
            }
        };
        controller.model.addObserver(observer);
    }, []);

    // Effect to apply the current theme (dark/light) to the root HTML element.
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', modelState.theme);
    }, [modelState.theme]);

    // Effect for setting up and tearing down global event listeners.
    useEffect(() => {
        /**
         * Handles global keyboard shortcuts for core application actions like undo, redo, copy, paste, and delete.
         */
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore keyboard events when an input field is focused.
            const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
            if (isInputFocused) return;

            // PATTERN: Command
            // Executes specific commands based on keyboard shortcuts.
            if (e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'z': e.preventDefault(); controller.undo(); break;
                    case 'y': e.preventDefault(); controller.redo(); break;
                    case 'c': e.preventDefault(); controller.executeCommandWithoutHistory(CopyCommand); break;
                    case 'x': e.preventDefault(); controller.executeCommand(CutCommand); break;
                    case 'v': e.preventDefault(); controller.executeCommand(PasteCommand); break;
                }
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace')) {
                controller.executeCommand(DeleteSelectedCommand);
            }
        };

        // Closes the context menu if a click occurs anywhere in the window.
        const handleMouseDown = () => {
            const { contextMenuState } = controller.model.getState();
            if (contextMenuState.visible) {
                controller.executeCommandWithoutHistory(ShowContextMenuCommand, { visible: false, x: 0, y: 0, type: 'object' });
            }
        };

        // Prevents losing work by prompting the user before closing the tab if there are unsaved changes.
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (controller.model.getState().isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    return (
        <div className="flex flex-col h-screen w-screen bg-background-secondary text-text-primary font-sans overflow-hidden">
            {/* Modal dialogs are rendered conditionally based on the model's state. */}
            {modelState.isModalOpen && <NewCanvasModal controller={controller} />}
            {modelState.isSaveModalOpen && <SaveProjectModal controller={controller} />}
            {modelState.isExportModalOpen && <ExportModal controller={controller} />}
            {modelState.isLoadModalOpen && <LoadModal controller={controller} />}
            {modelState.isUnsavedChangesModalOpen && <UnsavedChangesModal controller={controller} />}

            <Header controller={controller} modelState={modelState} />
            <main className="flex-1 flex overflow-hidden">
                <div className="relative flex flex-shrink-0 z-20">
                    <Sidebar controller={controller} modelState={modelState}/>
                    <PropertiesSlider
                        isExpanded={isPropertiesPanelExpanded}
                        controller={controller}
                        modelState={modelState}
                    />
                    {/* Button to toggle the visibility of the properties panel. */}
                    <button
                        onClick={() => setPropertiesPanelExpanded(!isPropertiesPanelExpanded)}
                        className="absolute top-1/2 -right-3 -translate-y-1/2 bg-background-tertiary hover:bg-accent-primary text-text-primary p-1 rounded-full z-30"
                        title={isPropertiesPanelExpanded ? "Collapse Properties" : "Expand Properties"}
                    >
                        {isPropertiesPanelExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>
                <section className="flex-1 bg-background-canvas flex items-center justify-center overflow-auto p-4 relative">
                    <CanvasComponent canvasRef={canvasRef} canvasSize={modelState.canvasSize} />
                </section>
                <LayersSidebar
                    isExpanded={isLayersPanelExpanded}
                    onToggle={() => setLayersPanelExpanded(!isLayersPanelExpanded)}
                    controller={controller}
                    modelState={modelState}
                />
            </main>
            <ContextMenu controller={controller} modelState={modelState} />
        </div>
    );
}