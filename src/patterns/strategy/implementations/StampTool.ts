// The strategy for placing stamp images on the canvas.
import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { AppController } from '../../../core/AppController';
import { SwitchToSelectToolCommand, UpdateCanvasStateCommand } from '../../command/implementations';
import { uniqueId } from '../../../utils/uniqueId';

// PATTERN: Strategy (Concrete) - Implements the stamp tool behavior.
export class StampTool extends Tool {
    constructor(controller: AppController) {
        super(controller);
    }

    public activate(): void {
        super.activate();
        const { activeStampCursor } = this.controller.model.getState();
        const cursorStyle = activeStampCursor ? `url(${activeStampCursor}) 16 16, crosshair` : 'crosshair';
        this.canvas.defaultCursor = cursorStyle;
        this.canvas.hoverCursor = cursorStyle;
    }

    public deactivate(): void {
        super.deactivate();
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';
    }

    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {
        const pointer = this.canvas.getPointer(o.e);
        const {
            activeStampSrc,
            defaultStampSize,
            activeLayerId
        } = this.controller.model.getState();

        if (!activeStampSrc) return;

        fabric.Image.fromURL(activeStampSrc, (img) => {
            const maxDim = Math.max(img.width || 1, img.height || 1);
            const scale = defaultStampSize / maxDim;

            img.set({
                left: pointer.x,
                top: pointer.y,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                id: uniqueId(),
                layerId: activeLayerId || undefined,
                selectable: false,
                evented: true,
            });

            this.canvas.add(img);
            this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            this.controller.saveStateToHistory();
        }, { crossOrigin: 'anonymous' });
    }

    public onDblClick(o: fabric.IEvent<MouseEvent>): void {
        const canvasObjects = this.canvas.getObjects();
        if (canvasObjects.length > 0) {
            const stampArtifact = canvasObjects[canvasObjects.length - 1];
            if (stampArtifact && stampArtifact.selectable === false) {
                this.canvas.remove(stampArtifact);
            }
        }

        const newTarget = this.canvas.findTarget(o.e, false);

        if (newTarget) {
            const { layers, activeLayerId } = this.controller.model.getState();
            const objectLayer = layers.find(l => l.id === newTarget.layerId);

            if (objectLayer && (!objectLayer.isLocked || objectLayer.id === activeLayerId)) {
                this.controller.executeCommand(SwitchToSelectToolCommand, newTarget as fabric.Object);
            }
        }
    }
}