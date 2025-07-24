// The strategy for drawing rectangle shapes.
import { fabric } from 'fabric';
import { ShapeTool } from '../ShapeTool';
import { ShapeType } from '../../factory';
import { AppController } from '../../../core/AppController';

// PATTERN: Strategy (Concrete) - Implements the rectangle drawing behavior.
export class RectTool extends ShapeTool {
    protected shapeType: ShapeType = 'rect';

    constructor(controller: AppController) {
        super(controller);
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        this._updateShapeSize(o);
    }
}