// The abstract base class for all tool strategies.
import { fabric } from 'fabric';
import type { AppController } from '../../core/AppController';
import { ObjectFactory } from '../factory';
import { SwitchToSelectToolCommand } from '../command/implementations';

// PATTERN: Strategy (Abstract) - Defines the common interface for all tools.
export abstract class Tool {
    protected controller: AppController;
    protected canvas: fabric.Canvas;
    protected state: { isDrawing: boolean; shape: fabric.Object | null; origin: fabric.Point | null };
    protected factory: ObjectFactory;

    constructor(controller: AppController) {
        this.controller = controller;
        if (!controller.fabricCanvas) throw new Error("Canvas must be initialized in controller");
        this.canvas = controller.fabricCanvas;
        this.state = { isDrawing: false, shape: null, origin: null };
        this.factory = controller.factory;
    }
    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {}
    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {}
    public onMouseUp(o: fabric.IEvent<MouseEvent>): void {}

    public onDblClick(o: fabric.IEvent<MouseEvent>): void {
        const target = o.target;
        if (!target) {
            return;
        }

        const { layers, activeLayerId } = this.controller.model.getState();
        const objectLayer = layers.find(l => l.id === target.layerId);

        if (objectLayer && (!objectLayer.isLocked || objectLayer.id === activeLayerId)) {
            this.controller.executeCommand(SwitchToSelectToolCommand, target as fabric.Object);
        }
    }

    public activate(): void {
        this.canvas.selection = false;
        this.canvas.getObjects().forEach(obj => {
            if (obj.isGridLine) return;
            obj.set({
                selectable: false,
                evented: true,
            });
        });
        this.canvas.discardActiveObject().renderAll();
    }

    public deactivate(): void {}
}