// FILE: src\core\AppController.ts

// The main controller (Singleton) for the application, handling user input and orchestrating model/view updates.
import { fabric } from 'fabric';
import { CanvasModel } from './CanvasModel';
import { HistoryManager } from '../patterns/memento/HistoryManager';
import { CanvasMemento } from '../patterns/memento/CanvasMemento';
import { SelectTool, RectTool, LineTool, TriangleTool, PencilTool, TextTool, EllipseTool, PenTool, StampTool } from '../patterns/strategy/implementations';
import { Tool } from '../patterns/strategy/Tool';
import { ICommand } from '../patterns/command/ICommand';
import { UpdateCanvasStateCommand } from '../patterns/command/implementations/UpdateCanvasStateCommand';
import { ShowContextMenuCommand } from '../patterns/command/implementations';
import { ObjectFactory } from '../patterns/factory';
import { svgToPngDataUrl } from '../utils/svgToPngDataUrl';
import { ILayer } from '../types/types';

// PATTERN: Singleton - Ensures a single instance of the AppController.
// PATTERN: Controller (MVC) - Acts as the controller, handling user actions and updating the model.
export class AppController {
    private static instance: AppController;
    public model: CanvasModel;
    public fabricCanvas: fabric.Canvas | null = null;
    public factory: ObjectFactory;
    private tools: { [key: string]: Tool }; // PATTERN: Strategy - Holds different tool strategies.
    private historyManager: HistoryManager; // PATTERN: Memento - Manages undo/redo history.
    private lastPosX: number = 0;
    private lastPosY: number = 0;

    private constructor() {
        this.model = new CanvasModel();
        this.tools = {};
        this.historyManager = new HistoryManager(this);
        this.factory = new ObjectFactory(); // PATTERN: Factory - Used to create objects.
    }

    public static getInstance(): AppController {
        if (!AppController.instance) {
            AppController.instance = new AppController();
        }
        return AppController.instance;
    }

    // PATTERN: Command - Executes a command and saves the state to history.
    public async executeCommand<C extends ICommand, A extends any[]>(
        CommandClass: new (controller: AppController, ...args: A) => C,
        ...args: A
    ): Promise<void> {
        const command = new CommandClass(this, ...args);
        await command.execute();
        this.saveStateToHistory();
    }

    // PATTERN: Command - Executes a command without saving to history (for UI-only updates).
    public async executeCommandWithoutHistory<C extends ICommand, A extends any[]>(
        CommandClass: new (controller: AppController, ...args: A) => C,
        ...args: A
    ): Promise<void> {
        const command = new CommandClass(this, ...args);
        await command.execute();
    }

    // Initializes the Fabric.js canvas and sets up tool strategies.
    public init(canvasEl: HTMLCanvasElement) {
        fabric.Object.prototype.toObject = (function (toObject) {
            return function (this: fabric.Object, propertiesToInclude) {
                propertiesToInclude = (propertiesToInclude || []).concat([
                    'layerId', 'id', 'isFillEnabled', 'solidFill', 'isGradientFillEnabled', 'gradientFill', 'isStrokeEnabled', 'solidStroke'
                ]);
                return toObject.call(this, propertiesToInclude);
            };
        })(fabric.Object.prototype.toObject);

        const { canvasSize } = this.model.getState();
        this.fabricCanvas = new fabric.Canvas(canvasEl, {
            ...canvasSize,
            preserveObjectStacking: true,
            backgroundVpt: false,
            selectionKey: 'ctrlKey',
        });

        // PATTERN: Strategy - Initializes all tool strategies for the application.
        this.tools = {
            select: new SelectTool(this),
            rect: new RectTool(this),
            ellipse: new EllipseTool(this),
            line: new LineTool(this),
            triangle: new TriangleTool(this),
            pencil: new PencilTool(this),
            text: new TextTool(this),
            pen: new PenTool(this),
            stamp: new StampTool(this)
        };
        this.setupCanvasListeners();
        this.initializeDefaultStampCursor();
        this.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }

    public snapPointToGrid(point: fabric.Point): fabric.Point {
        const { isGridVisible, gridSize } = this.model.getState();
        if (isGridVisible && gridSize > 0) {
            return new fabric.Point(
                Math.round(point.x / gridSize) * gridSize,
                Math.round(point.y / gridSize) * gridSize
            );
        }
        return point;
    }

    public snapValueToGrid(value: number): number {
        const { isGridVisible, gridSize } = this.model.getState();
        if (isGridVisible && gridSize > 0) {
            return Math.round(value / gridSize) * gridSize;
        }
        return value;
    }

    public updateLayerProperties(layerId: string, properties: Partial<ILayer>): void {
        const currentLayers = this.model.getState().layers;
        const newLayers = currentLayers.map(layer =>
            layer.id === layerId ? { ...layer, ...properties } : layer
        );
        this.model.setState({ layers: newLayers });
    }

    private async initializeDefaultStampCursor(): Promise<void> {
        const { activeStampSrc } = this.model.getState();
        if (activeStampSrc) {
            try {
                const cursorUrl = await svgToPngDataUrl(activeStampSrc);
                this.model.setState({ activeStampCursor: cursorUrl });
            } catch (error) {
                console.error('Failed to initialize default stamp cursor:', error);
            }
        }
    }

    // Centralized setup for all Fabric.js event listeners.
    private setupCanvasListeners() {
        if (!this.fabricCanvas) return;

        const selectionHandler = () => {
            const activeObject = this.fabricCanvas?.getActiveObject() || null;
            this.updateSelectionState(activeObject);
        };

        this.fabricCanvas.on('mouse:down', this.handleMouseDown);
        this.fabricCanvas.on('mouse:move', this.handleMouseMove);
        this.fabricCanvas.on('mouse:up', this.handleMouseUp);
        this.fabricCanvas.on('selection:created', selectionHandler);
        this.fabricCanvas.on('selection:updated', selectionHandler);
        this.fabricCanvas.on('selection:cleared', selectionHandler);
        this.fabricCanvas.on('text:changed', this.handleTextChanged);
        this.fabricCanvas.on('mouse:wheel', this.handleMouseWheel);
        this.fabricCanvas.on('mouse:dblclick', this.handleMouseDblClick);
        this.fabricCanvas.getElement().parentElement?.addEventListener('contextmenu', this.handleContextMenu);
    }

    private _panStart(e: MouseEvent) {
        if (!this.fabricCanvas) return;
        this.fabricCanvas.isDragging = true;
        this.fabricCanvas.selection = false;
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
    }

    private _panMove(e: MouseEvent) {
        if (!this.fabricCanvas) return;
        const vpt = this.fabricCanvas.viewportTransform;
        if (vpt) {
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
            this.fabricCanvas.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    }

    private _panEnd() {
        if (!this.fabricCanvas) return;
        this.fabricCanvas.isDragging = false;
        this.fabricCanvas.selection = true;
    }

    private handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const target = this.fabricCanvas?.findTarget(e, false);
        const hasSelection = this.fabricCanvas?.getActiveObjects().length ?? 0 > 0;
        const type = hasSelection || target ? 'object' : 'layer';
        this.executeCommandWithoutHistory(ShowContextMenuCommand, { visible: true, x: e.clientX, y: e.clientY, type });
    };

    // Delegates mouse events to the currently active tool strategy.
    private handleMouseDown = (o: fabric.IEvent<MouseEvent>) => {
        this.executeCommandWithoutHistory(ShowContextMenuCommand, { visible: false, x: 0, y: 0, type: 'object' });
        if (o.e && o.e.altKey) {
            this._panStart(o.e);
        } else {
            this.getActiveToolStrategy().onMouseDown(o);
        }
    };

    private handleMouseMove = (o: fabric.IEvent<MouseEvent>) => {
        if (o.e) { this.model.setState({ mousePosition: { x: o.e.clientX, y: o.e.clientY } }); }

        if (this.fabricCanvas?.isDragging && o.e) {
            this._panMove(o.e);
        } else {
            this.getActiveToolStrategy().onMouseMove(o);
        }
    };

    private handleMouseUp = (o: fabric.IEvent<MouseEvent>) => {
        if (this.fabricCanvas?.isDragging) {
            this._panEnd();
        } else {
            this.getActiveToolStrategy().onMouseUp(o);
        }
    };

    public updateSelectionState = (selectionCandidate: fabric.Object | fabric.ActiveSelection | null) => {
        if (selectionCandidate) {
            const selectedObjects: fabric.Object[] = selectionCandidate.type === 'activeSelection'
                ? (selectionCandidate as fabric.ActiveSelection).getObjects()
                : [selectionCandidate as fabric.Object];
            this.model.setState({
                selection: selectionCandidate,
                selectedObjects: selectedObjects,
            });
        } else {
            this.model.setState({
                selection: null,
                selectedObjects: [],
            });
        }
    };

    private handleTextChanged = () => { this.saveStateToHistory(); };

    private handleMouseWheel = (opt: fabric.IEvent<WheelEvent>) => {
        if (!opt.e || !this.fabricCanvas) return;
        const delta = opt.e.deltaY;
        let zoom = this.fabricCanvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        this.fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        this.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    };

    private handleMouseDblClick = (o: fabric.IEvent<MouseEvent>) => {
        this.getActiveToolStrategy().onDblClick(o);
    };

    // PATTERN: Strategy - Retrieves the currently active tool strategy from the collection.
    private getActiveToolStrategy = (): Tool => this.tools[this.model.getState().activeTool] || this.tools.select;

    // PATTERN: Memento - Creates a memento (snapshot) of the current application state.
    public createMemento = (): CanvasMemento => {
        if (!this.fabricCanvas) throw new Error("Canvas not initialized");
        const canvasJSON = this.fabricCanvas.toJSON();
        const stateToSave = { ...this.model.getState(), canvas: canvasJSON };
        return new CanvasMemento(stateToSave);
    }

    private _restoreSelection(restoredObjects: fabric.Object[]) {
        if (!this.fabricCanvas) return;

        if (restoredObjects.length > 1) {
            const selection = new fabric.ActiveSelection(restoredObjects, { canvas: this.fabricCanvas });
            this.fabricCanvas.setActiveObject(selection as fabric.Object);
            this.model.setState({ selection, selectedObjects: restoredObjects });
        } else if (restoredObjects.length === 1) {
            this.fabricCanvas.setActiveObject(restoredObjects[0]);
            this.model.setState({ selection: restoredObjects[0], selectedObjects: restoredObjects });
        }
    }

    // PATTERN: Memento - Restores the application state from a given memento.
    public restoreFromMemento(memento: CanvasMemento) {
        if (!this.fabricCanvas) return;
        const state = memento.getState();
        const selectedObjectIds = (state.selectedObjects as fabric.Object[]).map(o => o.id);

        this.model.setState({ ...state, selection: null, selectedObjects: [] });

        this.fabricCanvas.loadFromJSON(state.canvas, () => {
            if (!this.fabricCanvas) return;
            const objectsToSelect = this.fabricCanvas.getObjects().filter(obj => selectedObjectIds.includes(obj.id!));
            this._restoreSelection(objectsToSelect);
            this.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            this.updateHistoryState();
        });
    }

    public saveStateToHistory = () => {
        if (this.fabricCanvas) {
            this.historyManager.save();
            this.updateHistoryState();

            if (this.historyManager.canUndo()) {
                this.model.setState({ isDirty: true });
            } else {
                this.model.setState({ isDirty: false });
            }
            this.fabricCanvas.fire('app:history:saved');
        }
    };

    public undo = () => {
        this.historyManager.undo();
        this.updateHistoryState();
    };

    public redo = () => {
        this.historyManager.redo();
        this.updateHistoryState();
    };

    private updateHistoryState = () => {
        this.model.setState({ canUndo: this.historyManager.canUndo(), canRedo: this.historyManager.canRedo() });
    };
}