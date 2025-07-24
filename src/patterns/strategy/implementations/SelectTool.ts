// The strategy for selecting and transforming objects.
import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { UpdateCanvasStateCommand } from '../../command/implementations';
import { AppController } from '../../../core/AppController';

// PATTERN: Strategy (Concrete) - Implements object selection and transformation behavior.
export class SelectTool extends Tool {

    constructor(controller: AppController) {
        super(controller);
    }

    // Handles keyboard shortcuts like Ctrl+A for 'Select All'.
    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();

            const { layers, activeLayerId } = this.controller.model.getState();
            if (!activeLayerId) return;

            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer || !activeLayer.isVisible) return;

            const objectsToSelect = this.canvas.getObjects().filter(obj =>
                obj.layerId === activeLayerId && obj.selectable && !obj.isGridLine
            );

            if (objectsToSelect.length > 0) {
                this.canvas.discardActiveObject();
                const selection = new fabric.ActiveSelection(objectsToSelect, { canvas: this.canvas });
                this.canvas.setActiveObject(selection as fabric.Object);
                this.canvas.renderAll();
            }
        }
    };

    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {
        // Intentionally empty; Fabric's default engine handles selection.
    }

    public activate(): void {
        this.canvas.selection = true;
        this.canvas.getObjects().forEach(obj => {
            if (obj.isGridLine) return;
            obj.set({ evented: true });
        });

        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);

        document.addEventListener('keydown', this.handleKeyDown);
        this.canvas.on('before:transform', this.onBeforeTransform);
        this.canvas.on('after:transform', this.onAfterTransform);
        this.canvas.on('object:modified', this.onObjectModified);
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('object:scaling', this.onObjectScaling);
    }

    public deactivate(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.off('before:transform', this.onBeforeTransform);
        this.canvas.off('after:transform', this.onAfterTransform);
        this.canvas.off('object:modified', this.onObjectModified);
        this.canvas.off('object:moving', this.onObjectMoving);
        this.canvas.off('object:scaling', this.onObjectScaling);
    }

    private onObjectMoving = (o: fabric.IEvent) => {
        const target = o.target;
        if (!target) return;

        const { isGridVisible } = this.controller.model.getState();
        if (isGridVisible) {
            target.set({
                left: this.controller.snapValueToGrid(target.left!),
                top: this.controller.snapValueToGrid(target.top!)
            });
        }
    }

    private onObjectScaling = (o: fabric.IEvent) => {
        const target = o.target;
        if (target && target.type === 'i-text') {
            const iText = target as fabric.IText;
            const newFontSize = (iText.fontSize ?? 40) * (Math.abs(iText.scaleX ?? 1));
            this.controller.model.setState({ liveFontSize: Math.round(newFontSize) });
        }
    }

    private onBeforeTransform = (o: fabric.IEvent) => {
        if (o.target) {
            o.target.objectCaching = false;
        }
    }

    private onAfterTransform = (o: fabric.IEvent) => {
        if (o.target) {
            o.target.objectCaching = true;
        }
    }

    // Finalizes transformations and saves the state to history.
    private onObjectModified = (o: fabric.IEvent) => {
        const target = o.target;
        this.controller.model.setState({ liveFontSize: undefined });

        if (!target) {
            this.controller.saveStateToHistory();
            return;
        }

        if (target.type === 'i-text') {
            const iText = target as fabric.IText;
            const scaleFactor = Math.abs(iText.scaleX ?? 1);
            iText.fontSize = (iText.fontSize ?? 40) * scaleFactor;
            iText.set({ scaleX: 1, scaleY: 1 });
        }

        const { isGridVisible } = this.controller.model.getState();
        const snap = (value: number) => this.controller.snapValueToGrid(value);

        if (isGridVisible) {
            target.set({
                left: snap(target.left!),
                top: snap(target.top!),
                scaleX: snap(target.getScaledWidth()) / target.width!,
                scaleY: snap(target.getScaledHeight()) / target.height!
            });
        }

        this.controller.updateSelectionState(target);
        this.controller.saveStateToHistory();
    }
}