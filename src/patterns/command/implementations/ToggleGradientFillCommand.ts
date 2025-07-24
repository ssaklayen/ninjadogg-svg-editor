// Command to toggle the fill of a selected object between solid and gradient.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";
import { fabric } from "fabric";
import { uniqueId } from "../../../utils/uniqueId";
import { IGradientColorStop } from "../../../types/types";

// PATTERN: Command - Encapsulates enabling/disabling gradient fill on selected objects.
export class ToggleGradientFillCommand implements ICommand {
    private controller: AppController;
    private enabled: boolean;

    constructor(controller: AppController, enabled: boolean) {
        this.controller = controller;
        this.enabled = enabled;
    }

    public execute(): void {
        const activeObject = this.controller.fabricCanvas?.getActiveObject();
        if (!activeObject) return;

        const isGroup = activeObject.type === 'activeSelection';

        const applyToggle = (obj: fabric.Object) => {
            obj.isGradientFillEnabled = this.enabled;
            if (this.enabled) {
                if (isGroup || !obj.gradientFill) {
                    obj.gradientFill = {
                        type: 'linear',
                        coords: { x1: 0, y1: 0, x2: obj.width || 0, y2: 0 },
                        colorStops: [
                            { id: uniqueId(), offset: 0, color: '#4facfe' },
                            { id: uniqueId(), offset: 1, color: '#00f2fe' }
                        ] as IGradientColorStop[]
                    };
                }
            }
        };

        if (activeObject.type === 'activeSelection') {
            (activeObject as fabric.ActiveSelection).forEachObject(applyToggle);
        } else {
            applyToggle(activeObject);
        }

        const selectedObjects = activeObject.type === 'activeSelection'
            ? (activeObject as fabric.ActiveSelection).getObjects()
            : [activeObject];

        this.controller.model.setState({ selection: activeObject, selectedObjects });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}