// The strategy for drawing triangle shapes.
import { fabric } from 'fabric';
import { ShapeTool } from '../ShapeTool';
import { ShapeType } from '../../factory';
import { AppController } from '../../../core/AppController';

// PATTERN: Strategy (Concrete) - Implements the triangle drawing behavior.
export class TriangleTool extends ShapeTool {
    protected shapeType: ShapeType = 'triangle';

    constructor(controller: AppController) {
        super(controller);
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        this._updateShapeSize(o);
    }
}