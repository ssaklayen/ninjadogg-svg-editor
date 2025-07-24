// The model (MVC) for the application, holding all state and notifying observers of changes.
import { ICanvasState, IObserver, ILayer } from '../types/types';
import { uniqueId } from '../utils/uniqueId';

// PATTERN: Model (MVC) - Represents the application's data and business logic.
// PATTERN: Observer - Notifies observers (views) when its state changes.
export class CanvasModel {
    private observers: IObserver[] = [];
    private initialState: ICanvasState;
    private state: ICanvasState;

    constructor() {
        const initialLayer: ILayer = {
            id: uniqueId(),
            name: 'Layer 1',
            isVisible: true,
            isLocked: true,
            opacity: 1,
            previewBackground: 'dark',
        };

        const initialStamps = Array.from({ length: 10 }, (_, i) => `/stamps/stamp${i + 1}.svg`);

        this.initialState = {
            projectName: 'new-ninjadogg-project',
            theme: 'dark',
            layers: [initialLayer],
            activeLayerId: initialLayer.id,
            activeTool: 'select',
            isModalOpen: true,
            isSaveModalOpen: false,
            isExportModalOpen: false,
            isLoadModalOpen: false,
            isUnsavedChangesModalOpen: false,
            canvasSize: { width: 800, height: 600 },
            selection: null,
            selectedObjects: [],
            isGridVisible: false,
            gridSize: 20,
            gridColor: 'rgba(204, 204, 204, 0.5)',

            isTransparent: true,
            canvasSolidColor: '#ffffff',
            isCanvasGradientEnabled: false,
            canvasGradient: {
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
                colorStops: [{ id: uniqueId(), offset: 0, color: '#4facfe' }, { id: uniqueId(), offset: 1, color: '#00f2fe' }]
            },

            isDefaultFillEnabled: true,
            defaultSolidFill: '#ffffff',
            isDefaultStrokeEnabled: true,
            defaultShapeStroke: '#000000',
            defaultShapeStrokeWidth: 1,
            isDefaultGradientEnabled: false,
            defaultGradient: {
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
                colorStops: [{ id: uniqueId(), offset: 0, color: '#4facfe' }, { id: uniqueId(), offset: 1, color: '#00f2fe' }]
            },

            defaultFontFamily: 'Arial',
            defaultFontSize: 40,
            defaultFontWeight: 'normal',
            defaultFontStyle: 'normal',
            defaultTextFill: '#000000',
            defaultTextStroke: '#000000',
            defaultTextStrokeWidth: 1,
            isDefaultTextStrokeEnabled: false,

            stampGallery: initialStamps,
            activeStampSrc: initialStamps[0],
            activeStampCursor: '',
            defaultStampSize: 64,

            canUndo: false,
            canRedo: false,
            isDirty: false,

            lastSelectedShapeTool: 'rect',
            lastSelectedDrawingTool: 'pencil',

            clipboard: null,
            contextMenuState: { visible: false, x: 0, y: 0, type: 'object' },
            mousePosition: { x: 0, y: 0 },
            pendingAction: null,
        };
        this.state = JSON.parse(JSON.stringify(this.initialState));
    }

    public addObserver(observer: IObserver) { this.observers.push(observer); }

    private notifyObservers() { this.observers.forEach(observer => observer.update(this.getState())); }

    public setState(newState: Partial<ICanvasState>) { this.state = { ...this.state, ...newState }; this.notifyObservers(); }

    public getState = (): ICanvasState => ({ ...this.state });

    public getInitialState = (): ICanvasState => JSON.parse(JSON.stringify(this.initialState));
}