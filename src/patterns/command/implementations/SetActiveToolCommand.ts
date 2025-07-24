// Command to change the active tool.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { ICanvasState } from "../../../types/types";

// PATTERN: Command - Encapsulates changing the active tool.
export class SetActiveToolCommand implements ICommand {
    private controller: AppController;
    private toolName: string;
    private toolGroupToUpdate?: 'shape' | 'drawing';

    constructor(controller: AppController, toolName: string, toolGroupToUpdate?: 'shape' | 'drawing') {
        this.controller = controller;
        this.toolName = toolName;
        this.toolGroupToUpdate = toolGroupToUpdate;
    }

    // Deactivates the old tool strategy and activates the new one.
    public execute(): void {
        const fabricCanvas = this.controller.fabricCanvas;
        if (!fabricCanvas) return;

        const currentToolName = this.controller.model.getState().activeTool;
        const tools = (this.controller as any).tools;

        if (tools[currentToolName]) {
            tools[currentToolName].deactivate();
        }

        const newState: Partial<ICanvasState> = { activeTool: this.toolName };
        if (this.toolGroupToUpdate === 'shape') {
            newState.lastSelectedShapeTool = this.toolName;
        } else if (this.toolGroupToUpdate === 'drawing') {
            newState.lastSelectedDrawingTool = this.toolName;
        }
        this.controller.model.setState(newState);

        if (this.toolName === 'select') {
            fabricCanvas.defaultCursor = 'default';
            fabricCanvas.hoverCursor = 'move';
        } else {
            fabricCanvas.defaultCursor = 'crosshair';
            fabricCanvas.hoverCursor = 'crosshair';
        }

        if (tools[this.toolName]) {
            tools[this.toolName].activate();
        }
    }
}