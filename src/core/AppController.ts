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
import { EnterPenEditModeCommand } from '../patterns/command/implementations/EnterPenEditModeCommand';

export class AppController {
    private static instance: AppController;
    public model: CanvasModel;
    public fabricCanvas: fabric.Canvas | null = null;
    public factory: ObjectFactory;
    private tools: { [key: string]: Tool };
    private historyManager: HistoryManager;
    private lastPosX: number = 0;
    private lastPosY: number = 0;

    private constructor() {
        this.model = new CanvasModel();
        this.tools = {};
        this.historyManager = new HistoryManager(this);
        this.factory = new ObjectFactory();
    }

    public static getInstance(): AppController {
        if (!AppController.instance) {
            AppController.instance = new AppController();
        }
        return AppController.instance;
    }

    public async executeCommand<C extends ICommand, A extends any[]>(
        CommandClass: new (controller: AppController, ...args: A) => C,
        ...args: A
    ): Promise<void> {
        const command = new CommandClass(this, ...args);
        await command.execute();
        this.saveStateToHistory();
    }

    public async executeCommandWithoutHistory<C extends ICommand, A extends any[]>(
        CommandClass: new (controller: AppController, ...args: A) => C,
        ...args: A
    ): Promise<void> {
        const command = new CommandClass(this, ...args);
        await command.execute();
    }

    public init(canvasEl: HTMLCanvasElement) {
        // CRITICAL FIX: Set proper default object properties
        fabric.Object.prototype.set({
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true,
            noScaleCache: false,
            objectCaching: true,
            statefullCache: true
        });

        fabric.Object.prototype.toObject = (function (toObject) {
            return function (this: fabric.Object, propertiesToInclude) {
                propertiesToInclude = (propertiesToInclude || []).concat([
                    'layerId', 'id', 'isFillEnabled', 'solidFill', 'isGradientFillEnabled', 'gradientFill',
                    'isStrokeEnabled', 'solidStroke', 'isPenObject', 'anchorData'
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
            // Disable centered transforms at canvas level
            centeredScaling: false,
            centeredRotation: true
        });

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

    private setupCanvasListeners() {
        if (!this.fabricCanvas) return;

        const selectionHandler = () => {
            const activeObject = this.fabricCanvas?.getActiveObject() || null;
            // Ensure proper transform settings when selection changes
            if (activeObject) {
                activeObject.set({
                    centeredScaling: false,
                    centeredRotation: true,
                    originX: 'left',
                    originY: 'top'
                });
            }
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

            // Check if grid is visible and redraw it
            const { isGridVisible } = this.model.getState();
            if (isGridVisible) {
                // Remove old grid lines
                const oldGridLines = this.fabricCanvas.getObjects().filter(o => o.isGridLine);
                oldGridLines.forEach(line => this.fabricCanvas!.remove(line));

                // Redraw grid at new viewport position
                this.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            } else {
                this.fabricCanvas.requestRenderAll();
            }

            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    }

    private _panEnd() {
        if (!this.fabricCanvas) return;
        this.fabricCanvas.isDragging = false;

        const activeToolName = this.model.getState().activeTool;
        if (activeToolName === 'select') {
            this.fabricCanvas.selection = true;
        }

        // CRITICAL: Force all objects to recalculate their coordinates after viewport change
        this.fabricCanvas.getObjects().forEach(obj => {
            if (!obj.isGridLine && !obj.isArtboard) {
                // This forces Fabric to recalculate the object's bounding box and hit areas
                obj.setCoords();
            }
        });

        // Also clear and reset the cache
        this.fabricCanvas.calcOffset();
        this.fabricCanvas.requestRenderAll();
    }

    private handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const target = this.fabricCanvas?.findTarget(e, false);
        const hasSelection = this.fabricCanvas?.getActiveObjects().length ?? 0 > 0;
        const type = hasSelection || target ? 'object' : 'layer';
        this.executeCommandWithoutHistory(ShowContextMenuCommand, { visible: true, x: e.clientX, y: e.clientY, type });
    };

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

        // Check if pen tool is in edit mode before updating canvas state
        const penTool = this.getTool('pen') as PenTool;
        const isInPenEditMode = penTool && penTool.isInEditMode();

        if (!isInPenEditMode) {
            this.executeCommandWithoutHistory(UpdateCanvasStateCommand);
        } else {
            // If in pen edit mode, refresh the edit handles to reflect new zoom level
            penTool.refreshEditHandles();
        }
    };

    private handleMouseDblClick = (o: fabric.IEvent<MouseEvent>) => {
        const target = o.target;
        if (target instanceof fabric.Path && target.isPenObject) {
            if (o.e) {
                o.e.preventDefault();
                o.e.stopPropagation();
            }
            this.executeCommandWithoutHistory(EnterPenEditModeCommand, target);
            return;
        }

        this.getActiveToolStrategy().onDblClick(o);
    };

    public getActiveToolStrategy = (): Tool => this.tools[this.model.getState().activeTool] || this.tools.select;

    public createMemento = (): CanvasMemento => {
        if (!this.fabricCanvas) throw new Error("Canvas not initialized");
        const canvasJSON = this.fabricCanvas.toJSON();

        // Get pen tool edit state
        const penTool = this.getTool('pen') as PenTool;
        let penToolEditState = undefined;

        if (penTool && penTool.isInEditMode()) {
            penToolEditState = {
                isEditing: true,
                editingObjectId: penTool.getEditingObjectId()
            };
        }

        const stateToSave = {
            ...this.model.getState(),
            canvas: canvasJSON,
            penToolEditState
        };

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

    public restoreFromMemento(memento: CanvasMemento) {
        if (!this.fabricCanvas) return;
        const state = memento.getState();
        const selectedObjectIds = (state.selectedObjects as fabric.Object[]).map(o => o.id);
        const penToolEditState = state.penToolEditState;

        // Batch all updates
        this.fabricCanvas.renderOnAddRemove = false;
        const currentRenderAll = this.fabricCanvas.requestRenderAll;
        let renderRequested = false;

        // Override requestRenderAll to batch renders
        this.fabricCanvas.requestRenderAll = () => {
            renderRequested = true;
            return this.fabricCanvas!;
        };

        this.model.setState({ ...state, selection: null, selectedObjects: [] });

        this.fabricCanvas.loadFromJSON(state.canvas, () => {
            if (!this.fabricCanvas) return;

            // Ensure all objects have proper transform settings
            this.fabricCanvas.getObjects().forEach(obj => {
                if (!obj.isGridLine && !obj.isArtboard) {
                    obj.set({
                        centeredScaling: false,
                        centeredRotation: true,
                        originX: 'left',
                        originY: 'top'
                    });
                }
            });

            const objectsToSelect = this.fabricCanvas.getObjects().filter(obj => selectedObjectIds.includes(obj.id!));
            this._restoreSelection(objectsToSelect);
            this.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            this.updateHistoryState();

            // Fire event
            this.fabricCanvas.fire('history:restored', {
                restoredObjects: this.fabricCanvas.getObjects(),
                penToolEditState
            });

            // Restore rendering and do single render
            this.fabricCanvas.requestRenderAll = currentRenderAll;
            this.fabricCanvas.renderOnAddRemove = true;

            if (renderRequested) {
                this.fabricCanvas.requestRenderAll();
            }
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

    public getTool = (toolName: string): Tool | undefined => {
        return this.tools[toolName];
    }
}