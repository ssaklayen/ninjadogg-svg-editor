// Command to handle loading different file types (Project JSON, Image, SVG).
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { LoadImageCommand } from "./LoadImageCommand";
import { LoadSVGCommand } from "./LoadSVGCommand";
import { SetActiveToolCommand } from "./SetActiveToolCommand";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - A facade command that delegates to other specific load commands.
export class LoadFileCommand implements ICommand {
    private controller: AppController;
    private file: File;

    constructor(controller: AppController, file: File) {
        this.controller = controller;
        this.file = file;
    }

    // Reads the file and delegates to the appropriate command based on file type.
    public async execute(): Promise<void> {
        const fileType = this.file.type;
        const reader = new FileReader();
        const projectName = this.file.name.replace(/\.[^/.]+$/, "");

        reader.onload = async (e) => {
            const result = e.target?.result;
            if (typeof result !== 'string') return;

            if (fileType.startsWith('image/')) {
                await this.controller.executeCommandWithoutHistory(LoadImageCommand, result, projectName);
            } else if (fileType === 'image/svg+xml') {
                await this.controller.executeCommandWithoutHistory(LoadSVGCommand, result, projectName);
            } else if (this.file.name.endsWith('.json')) {
                await this.loadProject(result);
            }
        };

        if (this.file.type.startsWith('image/')) {
            reader.readAsDataURL(this.file);
        } else {
            reader.readAsText(this.file);
        }
    }

    private async loadProject(jsonString: string): Promise<void> {
        const fabricCanvas = this.controller.fabricCanvas;
        if (!fabricCanvas) return;

        const projectState = JSON.parse(jsonString);
        const { canvas, ...modelState } = projectState;

        fabricCanvas.setWidth(modelState.canvasSize.width);
        fabricCanvas.setHeight(modelState.canvasSize.height);
        fabricCanvas.calcOffset();

        await new Promise<void>(resolve => {
            fabricCanvas.loadFromJSON(canvas, () => {
                // First, update the model state. This triggers the React re-render.
                // The LayersPanel useEffect will now see a canvas populated with objects.
                this.controller.model.setState({
                    ...modelState,
                    isModalOpen: false,
                    isSaveModalOpen: false,
                    isExportModalOpen: false,
                    isDirty: false
                });

                // Then, perform canvas-specific updates.
                fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
                new SetActiveToolCommand(this.controller, 'select').execute();

                const historyManager = (this.controller as any).historyManager;
                historyManager.clear();

                // UpdateCanvasStateCommand will sync layer properties (visibility, etc.)
                this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
                this.controller.saveStateToHistory(); // Create a new history baseline
                this.controller.model.setState({ isDirty: false });

                resolve();
            });
        });
    }
}