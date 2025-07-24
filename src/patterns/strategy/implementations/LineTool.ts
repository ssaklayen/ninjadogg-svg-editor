// The strategy for drawing line shapes.
import { fabric } from 'fabric';
import { ShapeTool } from '../ShapeTool';
import { ShapeType } from '../../factory';
import { AppController } from '../../../core/AppController';

// PATTERN: Strategy (Concrete) - Implements the line drawing behavior.
export class LineTool extends ShapeTool {
    protected shapeType: ShapeType = 'line';

    constructor(controller: AppController) {
        super(controller);
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        if (!this.state.isDrawing || !this.state.shape) return;
        const pointer = this.canvas.getPointer(o.e);
        (this.state.shape as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
        this.canvas.renderAll();
    }
}