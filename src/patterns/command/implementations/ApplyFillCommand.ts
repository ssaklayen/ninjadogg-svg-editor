// Command to apply the stored fill (solid or gradient) properties to a Fabric.js object.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";

// PATTERN: Command - Encapsulates the logic for applying fill styles to an object.
export class ApplyFillCommand implements ICommand {
    private controller: AppController;
    private targetObject: fabric.Object;
    private noRender: boolean;

    constructor(controller: AppController, targetObject: fabric.Object, noRender: boolean = false) {
        this.controller = controller;
        this.targetObject = targetObject;
        this.noRender = noRender;
    }

    public execute(): void {
        if (!this.targetObject) return;

        if (this.targetObject.isGradientFillEnabled && this.targetObject.gradientFill) {
            const sourceGradient = this.targetObject.gradientFill;
            const options: any = {
                type: sourceGradient.type,
                colorStops: sourceGradient.colorStops,
            };

            if (sourceGradient.type === 'radial') {
                options.coords = {
                    x1: this.targetObject.width! / 2, y1: this.targetObject.height! / 2,
                    x2: this.targetObject.width! / 2, y2: this.targetObject.height! / 2,
                    r1: 0, r2: this.targetObject.width! / 2
                };
            } else {
                options.coords = { x1: 0, y1: 0, x2: this.targetObject.width!, y2: 0 };
            }
            this.targetObject.set('fill', new fabric.Gradient(options));
        } else {
            this.targetObject.set('fill', this.targetObject.solidFill || '#ffffff');
        }

        if (!this.noRender) {
            this.controller.fabricCanvas?.renderAll();
        }
    }
}