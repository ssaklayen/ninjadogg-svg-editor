// The strategy for drawing ellipse shapes.
import { fabric } from 'fabric';
import { ShapeTool } from '../ShapeTool';
import { ShapeType } from '../../factory';
import { AppController } from '../../../core/AppController';

// PATTERN: Strategy (Concrete) - Implements the ellipse drawing behavior.
export class EllipseTool extends ShapeTool {
    protected shapeType: ShapeType = 'ellipse';

    constructor(controller: AppController) {
        super(controller);
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        this._updateShapeSize(o);
    }
}