// Command to set initial custom properties on a newly created or loaded object.
import { ICommand } from "../ICommand";
import { fabric } from "fabric";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the initialization logic for custom object properties.
export class InitializeObjectPropertiesCommand implements ICommand {
    private targetObject: fabric.Object;

    constructor(private controller: AppController, targetObject: fabric.Object) {
        this.targetObject = targetObject;
    }

    // Applies default fill and stroke properties based on the object's type.
    public execute(): void {
        if (!this.targetObject) return;

        const isPencilPath = this.targetObject.type === 'path';

        if (this.targetObject.isFillEnabled === undefined) {
            this.targetObject.isFillEnabled = !isPencilPath;
        }

        if (this.targetObject.isStrokeEnabled === undefined) {
            this.targetObject.isStrokeEnabled = true;
        }

        if (this.targetObject.solidFill === undefined) {
            const currentFill = this.targetObject.get('fill');
            if (typeof currentFill === 'string') {
                this.targetObject.solidFill = currentFill;
            } else {
                this.targetObject.solidFill = '#ffffff';
            }
        }

        if (this.targetObject.solidStroke === undefined) {
            const currentStroke = this.targetObject.get('stroke');
            if (typeof currentStroke === 'string' && currentStroke !== 'transparent' && currentStroke !== 'none') {
                this.targetObject.solidStroke = currentStroke;
            } else {
                this.targetObject.solidStroke = '#000000';
            }
        }
    }
}