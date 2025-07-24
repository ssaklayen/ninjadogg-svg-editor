// Command to create a new canvas and reset the application state.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { CanvasSize, IGradientOptions, ILayer } from "../../../types/types";
import { uniqueId } from "../../../utils/uniqueId";

interface BackgroundOptions {
    isTransparent: boolean;
    isGradient: boolean;
    bgColor: string;
    gradient: IGradientOptions;
}

// PATTERN: Command - Encapsulates the logic for creating a new canvas.
export class CreateCanvasCommand implements ICommand {
    private controller: AppController;
    private projectName: string;
    private size: CanvasSize;
    private options: BackgroundOptions;

    constructor(controller: AppController, projectName: string, size: CanvasSize, options: BackgroundOptions) {
        this.controller = controller;
        this.projectName = projectName;
        this.size = size;
        this.options = options;
    }

    // Resets the model to a pristine state with new canvas dimensions and background.
    public execute(): void {
        const currentTheme = this.controller.model.getState().theme;
        this.controller.fabricCanvas?.dispose();
        this.controller.fabricCanvas = null;

        const pristineState = this.controller.model.getInitialState();

        const initialLayer: ILayer = {
            id: uniqueId(),
            name: 'Layer 1',
            isVisible: true,
            opacity: 1,
            isLocked: true,
            previewBackground: currentTheme === 'dark' ? 'dark' : 'light',
        };

        this.controller.model.setState({
            ...pristineState,
            projectName: this.projectName.trim() || pristineState.projectName,
            theme: currentTheme,
            layers: [initialLayer],
            activeLayerId: initialLayer.id,
            canvasSize: this.size,
            isModalOpen: false,
            isDirty: false,
            isTransparent: this.options.isTransparent,
            isCanvasGradientEnabled: this.options.isGradient,
            canvasSolidColor: this.options.bgColor,
            canvasGradient: this.options.gradient,
        });

        const historyManager = (this.controller as any).historyManager;
        historyManager.clear();
        (this.controller as any).updateHistoryState();
    }
}