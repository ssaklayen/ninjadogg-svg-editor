import { fabric } from 'fabric';
import { Tool } from './Tool';
import { ShapeType } from '../factory';
import { ApplyFillCommand, UpdateCanvasStateCommand } from '../command/implementations';
import { AppController } from '../../core/AppController';

export abstract class ShapeTool extends Tool {
    protected abstract shapeType: ShapeType;
    private livePreviewShape: fabric.Object | null = null;

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

        // Create a separate live preview shape with visible properties
        this.createLivePreview(pointer);
    }

    private createLivePreview(origin: fabric.Point): void {
        const state = this.controller.model.getState();

        // Create a preview shape with explicit visible properties
        if (this.shapeType === 'ellipse') {
            this.livePreviewShape = new fabric.Ellipse({
                left: origin.x,
                top: origin.y,
                rx: 0,
                ry: 0,
                fill: 'rgba(200, 200, 200, 0.3)',
                stroke: state.defaultShapeStroke || '#000000',
                strokeWidth: state.defaultShapeStrokeWidth || 1,
                selectable: false,
                evented: false,
                excludeFromExport: true
            });
        } else if (this.shapeType === 'line') {
            this.livePreviewShape = new fabric.Line(
                [origin.x, origin.y, origin.x, origin.y],
                {
                    stroke: state.defaultShapeStroke || '#000000',
                    strokeWidth: state.defaultShapeStrokeWidth || 1,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true
                }
            );
        } else { // rect, triangle
            const ShapeClass = this.shapeType === 'rect' ? fabric.Rect : fabric.Triangle;
            this.livePreviewShape = new ShapeClass({
                left: origin.x,
                top: origin.y,
                width: 0,
                height: 0,
                fill: 'rgba(200, 200, 200, 0.3)',
                stroke: state.defaultShapeStroke || '#000000',
                strokeWidth: state.defaultShapeStrokeWidth || 1,
                selectable: false,
                evented: false,
                excludeFromExport: true
            });
        }

        // Add the preview shape to canvas
        this.canvas.add(this.livePreviewShape);
        this.canvas.renderAll();
    }

    protected _updateShapeSize(o: fabric.IEvent<MouseEvent>): void {
        if (!this.state.isDrawing || !this.state.shape || !this.state.origin || !this.livePreviewShape) return;

        const pointer = this.canvas.getPointer(o.e);
        const { x, y } = this.state.origin;

        if (this.livePreviewShape.type === 'ellipse') {
            const ellipse = this.livePreviewShape as fabric.Ellipse;
            let rx = Math.abs(x - pointer.x) / 2;
            let ry = Math.abs(y - pointer.y) / 2;

            if (o.e.shiftKey) {
                rx = ry = Math.max(rx, ry);
            }

            // IMPORTANT: Use the minimum of x/pointer.x for left, y/pointer.y for top
            // This ensures the ellipse is positioned correctly regardless of drag direction
            ellipse.set({
                left: Math.min(x, pointer.x),
                top: Math.min(y, pointer.y),
                rx: rx,
                ry: ry,
                originX: 'left',
                originY: 'top'
            });

            // Update the actual shape data
            (this.state.shape as fabric.Ellipse).set({
                left: ellipse.left,
                top: ellipse.top,
                rx: rx,
                ry: ry,
                originX: 'left',
                originY: 'top'
            });
        } else if (this.livePreviewShape.type === 'line') {
            (this.livePreviewShape as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
            (this.state.shape as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
        } else { // For Rect and Triangle
            let width = Math.abs(pointer.x - x);
            let height = Math.abs(pointer.y - y);

            if (o.e.shiftKey) {
                const side = Math.max(width, height);
                width = side;
                height = side;
            }

            this.livePreviewShape.set({
                width: width,
                height: height,
                left: pointer.x > x ? x : x - width,
                top: pointer.y > y ? y : y - height
            });

            // Update the actual shape data
            this.state.shape.set({
                width: width,
                height: height,
                left: this.livePreviewShape.left,
                top: this.livePreviewShape.top
            });
        }

        this.canvas.renderAll();
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        this._updateShapeSize(o);
    }

    public onMouseUp(o: fabric.IEvent<MouseEvent>): void {
        if (!this.state.isDrawing || !this.state.shape) return;
        this.state.isDrawing = false;

        // Remove the live preview
        if (this.livePreviewShape) {
            this.canvas.remove(this.livePreviewShape);
            this.livePreviewShape = null;
        }

        const shape = this.state.shape;

        const hasSize = (shape.width! > 2 && shape.height! > 2) ||
            ((shape as any).radius && (shape as any).radius > 1) ||
            (shape.type === 'line' && (shape.width! > 2 || shape.height! > 2)) ||
            (shape.type === 'ellipse' && ((shape as fabric.Ellipse).rx! > 1 || (shape as fabric.Ellipse).ry! > 1));

        if (!hasSize) {
            // Shape too small, don't add it
            this.state.shape = null;
            this.canvas.renderAll();
            return;
        }

        // Apply grid snapping on release
        const { isGridVisible } = this.controller.model.getState();
        if (isGridVisible) {
            this.applyGridSnapping(shape);
        }

        // Now add the actual shape with proper properties
        const state = this.controller.model.getState();

        // Set proper fill based on state
        if (shape.isFillEnabled) {
            shape.set('fill', shape.solidFill || state.defaultSolidFill);
        } else {
            shape.set('fill', 'transparent');
        }

        // Set proper stroke based on state
        shape.set({
            stroke: shape.isStrokeEnabled ? (shape.solidStroke || state.defaultShapeStroke) : 'transparent',
            strokeWidth: state.defaultShapeStrokeWidth,
            selectable: false,
            evented: true
        });

        shape.setCoords();

        // Add the shape to canvas
        this.canvas.add(shape);

        // Apply fill styles (gradients if enabled)
        this.controller.executeCommandWithoutHistory(ApplyFillCommand, shape, true);
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
        this.controller.saveStateToHistory();

        this.state.shape = null;
    }

    private applyGridSnapping(shape: fabric.Object): void {
        const { gridSize } = this.controller.model.getState();

        // Get viewport transform to understand where the grid actually is
        const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const panX = vpt[4];
        const panY = vpt[5];

        // Calculate where the visual grid starts (same as in drawGrid)
        const viewPortLeft = -panX / zoom;
        const viewPortTop = -panY / zoom;
        const gridOffsetX = (Math.ceil(viewPortLeft / gridSize) * gridSize) - viewPortLeft;
        const gridOffsetY = (Math.ceil(viewPortTop / gridSize) * gridSize) - viewPortTop;

        // Viewport-aware snap function
        const snap = (value: number, isVertical: boolean = false) => {
            if (isVertical) {
                // For vertical positions (Y axis)
                const offset = value - viewPortTop;
                const snappedOffset = Math.round((offset - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
                return viewPortTop + snappedOffset;
            } else {
                // For horizontal positions (X axis)
                const offset = value - viewPortLeft;
                const snappedOffset = Math.round((offset - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
                return viewPortLeft + snappedOffset;
            }
        };

        // Get current bounds
        const bounds = shape.getBoundingRect(true);

        // Snap all edges
        const snappedLeft = snap(bounds.left, false);
        const snappedTop = snap(bounds.top, true);
        const snappedRight = snap(bounds.left + bounds.width, false);
        const snappedBottom = snap(bounds.top + bounds.height, true);

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
                // During creation, ellipses use left/top origin
                // The rx and ry are radii, so we need half the dimensions
                ellipse.set({
                    left: snappedLeft,
                    top: snappedTop,
                    rx: snappedWidth / 2,
                    ry: snappedHeight / 2,
                    originX: 'left',
                    originY: 'top'
                });
                break;
            case 'line':
                const line = shape as fabric.Line;
                line.set({
                    x1: snappedLeft,
                    y1: snappedTop,
                    x2: snappedRight,
                    y2: snappedBottom
                });
                break;
        }
    }

    public deactivate(): void {
        super.deactivate();
        // Clean up any live preview on tool switch
        if (this.livePreviewShape) {
            this.canvas.remove(this.livePreviewShape);
            this.livePreviewShape = null;
        }
    }
}