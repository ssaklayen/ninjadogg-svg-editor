// The abstract base class for all shape-drawing tool strategies.
import { fabric } from 'fabric';
import { Tool } from './Tool';
import { ShapeType } from '../factory';
import { ApplyFillCommand, UpdateCanvasStateCommand } from '../command/implementations';
import { AppController } from '../../core/AppController';

// PATTERN: Strategy (Abstract) - Defines the common interface for tools that draw shapes.
export abstract class ShapeTool extends Tool {
    protected abstract shapeType: ShapeType;

    constructor(controller: AppController) {
        super(controller);
    }

    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {
        const pointerObj = this.canvas.getPointer(o.e);
        const pointer = new fabric.Point(pointerObj.x, pointerObj.y);

        this.state.isDrawing = true;
        this.state.origin = pointer.clone();

        // Create shape without snapping initially
        const newShape = this.factory.create(this.shapeType, pointer, this.controller.model.getState());
        this.state.shape = newShape;

        newShape.set({ evented: true });
        this.controller.executeCommandWithoutHistory(ApplyFillCommand, newShape);
        this.canvas.add(newShape);

    }

    protected _updateShapeSize(o: fabric.IEvent<MouseEvent>): void {
        if (!this.state.isDrawing || !this.state.shape || !this.state.origin) return;

        const pointer = this.canvas.getPointer(o.e);
        const { x, y } = this.state.origin;

        if (this.state.shape.type === 'ellipse') {
            const ellipse = this.state.shape as fabric.Ellipse;
            let rx = Math.abs(x - pointer.x) / 2;
            let ry = Math.abs(y - pointer.y) / 2;

            if (o.e.shiftKey) {
                rx = ry = Math.max(rx, ry);
            }

            ellipse.set({
                left: x < pointer.x ? x : x - rx * 2,
                top: y < pointer.y ? y : y - ry * 2,
                rx: rx,
                ry: ry
            });
        } else { // For Rect and Triangle
            let width = Math.abs(pointer.x - x);
            let height = Math.abs(pointer.y - y);

            if (o.e.shiftKey) {
                const side = Math.max(width, height);
                width = side;
                height = side;
            }

            this.state.shape.set({
                width: width,
                height: height,
                left: pointer.x > x ? x : x - width,
                top: pointer.y > y ? y : y - height
            });
        }

    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        this._updateShapeSize(o);
    }

    public onMouseUp(o: fabric.IEvent<MouseEvent>): void {
        if (!this.state.isDrawing || !this.state.shape) return;
        this.state.isDrawing = false;
        const shape = this.state.shape;

        const hasSize = (shape.width! > 2 && shape.height! > 2) || ((shape as any).radius && (shape as any).radius > 1) || (shape.type === 'line' && (shape.width! > 2 || shape.height! > 2));

        if (!hasSize) {
            this.canvas.remove(shape);
        } else {
            // Apply grid snapping on release
            const { isGridVisible } = this.controller.model.getState();
            if (isGridVisible) {
                this.applyGridSnapping(shape);
            }

            shape.set({ selectable: false, evented: true });
            shape.setCoords();

            this.controller.executeCommandWithoutHistory(ApplyFillCommand, shape, true);
            this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            this.controller.saveStateToHistory();
        }
        this.state.shape = null;
    }

    private applyGridSnapping(shape: fabric.Object): void {
        const snap = (value: number) => this.controller.snapValueToGrid(value);

        // Get current bounds
        const bounds = shape.getBoundingRect(true);

        // Snap all edges
        const snappedLeft = snap(bounds.left);
        const snappedTop = snap(bounds.top);
        const snappedRight = snap(bounds.left + bounds.width);
        const snappedBottom = snap(bounds.top + bounds.height);

        // Calculate new dimensions
        const snappedWidth = snappedRight - snappedLeft;
        const snappedHeight = snappedBottom - snappedTop;

        // Apply snapped values based on shape type
        switch (shape.type) {
            case 'rect':
            case 'triangle':
                shape.set({
                    left: snappedLeft,
                    top: snappedTop,
                    width: snappedWidth,
                    height: snappedHeight
                });
                break;
            case 'ellipse':
                const ellipse = shape as fabric.Ellipse;
                ellipse.set({
                    left: snappedLeft + snappedWidth / 2,
                    top: snappedTop + snappedHeight / 2,
                    rx: snappedWidth / 2,
                    ry: snappedHeight / 2
                });
                break;
        }
    }
}