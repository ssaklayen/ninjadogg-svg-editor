import { fabric } from 'fabric';

/**
 * Defines a type for preview background styles.
 *
 * The `PreviewBackground` type is a string-based union that specifies
 * the available styles for a preview background. These styles represent
 * different visual themes that can be applied to a background.
 *
 * Possible values are:
 * - 'dark': Represents a dark theme background.
 * - 'light': Represents a light theme background.
 * - 'flat-dark': Represents a flat variant of a dark theme.
 * - 'flat-white': Represents a flat variant of a white/light theme.
 *
 * This type can be used to enforce consistency when specifying background
 * styles for previews in user interfaces or design systems.
 */
export type PreviewBackground = 'dark' | 'light' | 'flat-dark' | 'flat-white';
/**
 * Represents the theme mode for an application or component.
 *
 * The `Theme` type defines two possible values:
 * - `light`: Corresponds to a light-themed user interface.
 * - `dark`: Corresponds to a dark-themed user interface.
 *
 * This type can be utilized in theming systems to toggle between light and dark modes based on user preferences or system settings.
 */
export type Theme = 'light' | 'dark';

/**
 * Represents a basic Layer interface within a system, defining core properties
 * associated with managing and rendering a layer.
 *
 * @interface ILayer
 *
 * @property {string} id
 * A unique identifier for the layer.
 *
 * @property {string} name
 * The display name of the layer.
 *
 * @property {boolean} isVisible
 * Indicates whether the layer is visible or not.
 *
 * @property {number} opacity
 * The transparency level of the layer, typically ranging from 0 (completely transparent) to 1 (completely opaque).
 *
 * @property {boolean} isLocked
 * Determines whether the layer is locked and thereby not editable.
 *
 * @property {PreviewBackground} [previewBackground]
 * An optional property defining the layer's preview background settings.
 */
export interface ILayer {
    id: string;
    name: string;
    isVisible: boolean;
    opacity: number;
    isLocked: boolean;
    previewBackground?: PreviewBackground;
}

/**
 * Represents the dimensions of a canvas.
 *
 * This interface is used to specify the width and height of a canvas element.
 */
export interface CanvasSize { width: number; height: number; }

/**
 * Represents a color stop within a gradient.
 *
 * Used to define the position and color of a transition point in gradients.
 */
export interface IGradientColorStop {
    id:string;
    offset: number;
    color: string;
}

/**
 * Defines the options for creating a gradient.
 */
export interface IGradientOptions {
    type: 'linear' | 'radial';
    colorStops: IGradientColorStop[];
    coords: {
        x1: number; y1: number; x2: number; y2:number;
        r1?: number; r2?: number;
    };
}

/**
 * Represents the state of a context menu.
 *
 * Provides information about the visibility, position, and type of the context menu.
 */
export interface IContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    type: 'object' | 'layer';
}

/**
 * Represents the state of a canvas, including its configuration, current settings, and active tools.
 */
export interface ICanvasState {
    projectName: string;
    theme: Theme;
    layers: ILayer[];
    activeLayerId: string | null;
    activeTool: string;
    isModalOpen: boolean;
    isSaveModalOpen: boolean;
    isExportModalOpen: boolean;
    isLoadModalOpen: boolean;
    isUnsavedChangesModalOpen: boolean;
    canvasSize: CanvasSize;
    selection: fabric.Object | fabric.ActiveSelection | null;
    selectedObjects: fabric.Object[];
    isGridVisible: boolean;
    gridSize: number;
    gridColor: string;
    isBorderVisible: boolean;
    borderColor: string;

    isDefaultFillEnabled: boolean;
    defaultSolidFill: string;
    isDefaultStrokeEnabled: boolean;
    defaultShapeStroke: string;
    defaultShapeStrokeWidth: number;
    isDefaultGradientEnabled: boolean;
    defaultGradient: IGradientOptions | null;

    isTransparent: boolean;
    canvasSolidColor: string;
    isCanvasGradientEnabled: boolean;
    canvasGradient: IGradientOptions | null;

    defaultFontFamily: string;
    defaultFontSize: number;
    defaultFontWeight: string;
    defaultFontStyle: string;
    defaultTextFill: string;
    defaultTextStroke: string;
    defaultTextStrokeWidth: number;
    isDefaultTextStrokeEnabled: boolean;

    stampGallery: string[];
    activeStampSrc: string;
    activeStampCursor: string;
    defaultStampSize: number;

    canUndo: boolean;
    canRedo: boolean;
    isDirty: boolean;

    lastSelectedShapeTool: string;
    lastSelectedDrawingTool: string;

    clipboard: { objects: fabric.Object[], isLayer: boolean } | null;
    contextMenuState: IContextMenuState;
    mousePosition: { x: number, y: number };

    liveFontSize?: number;
    pendingAction: (() => void) | null;
}

/**
 * The IObserver interface is used to define the contract for observer objects
 * that subscribe to and receive notifications about state updates for the
 * observed subject, typically as part of the Observer Design Pattern.
 *
 * The objects that implement this interface are expected to define a method
 * `update` that will be invoked whenever the subject's state changes.
 *
 * @interface
 * @property {Function} update - A method that gets called to notify the observer
 * about changes in the observed subject's state.
 * @param {ICanvasState} state - The updated state object passed to the observer.
 */
export interface IObserver { update: (state: ICanvasState) => void; }