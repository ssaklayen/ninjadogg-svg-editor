// Command to update the model's default properties for new objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { ICanvasState } from "../../../types/types";
import { UpdateBrushPropertiesCommand } from "./UpdateBrushPropertiesCommand";

// PATTERN: Command - Encapsulates a batch update of default drawing properties in the model.
export class UpdateDrawingDefaultsCommand implements ICommand {
    constructor(private controller: AppController, private properties: Partial<ICanvasState>) { }

    public async execute(): Promise<void> {
        this.controller.model.setState(this.properties);

        const pencilProps: (keyof ICanvasState)[] = ['defaultShapeStroke', 'defaultShapeStrokeWidth'];
        const needsBrushUpdate = Object.keys(this.properties).some(key =>
            pencilProps.includes(key as keyof ICanvasState)
        );

        if (needsBrushUpdate) {
            await this.controller.executeCommandWithoutHistory(UpdateBrushPropertiesCommand);
        }
    }
}