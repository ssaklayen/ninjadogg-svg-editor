// Command to save the entire application state to a JSON file.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the project saving logic.
export class SaveProjectCommand implements ICommand {
    private controller: AppController;
    private filename: string;

    constructor(controller: AppController, filename: string) {
        this.controller = controller;
        this.filename = filename.endsWith('.json') ? filename : `${filename}.json`;
    }

    // Serializes the model and canvas state to JSON and triggers a download.
    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        const modelState = this.controller.model.getState();
        const canvasState = canvas.toJSON([
            'layerId', 'id', 'isFillEnabled', 'solidFill',
            'isGradientFillEnabled', 'gradientFill', 'isStrokeEnabled', 'solidStroke'
        ]);

        const projectState = {
            ...modelState,
            canvas: canvasState
        };

        const jsonString = JSON.stringify(projectState, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = this.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const { pendingAction } = this.controller.model.getState();
        if (pendingAction) {
            pendingAction();
        }

        this.controller.model.setState({
            isDirty: false,
            pendingAction: null
        });
    }
}