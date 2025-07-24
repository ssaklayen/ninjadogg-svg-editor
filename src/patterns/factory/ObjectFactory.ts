// A facade factory for creating all types of fabric objects.
import { fabric } from 'fabric';
import { ICanvasState } from '../../types/types';
import { ShapeFactory } from './ShapeFactory';
import { TextFactory } from './TextFactory';

export type ShapeType = 'rect' | 'ellipse' | 'triangle' | 'line' | 'polygon' | 'polyline';
export type ObjectType = ShapeType | 'text';

// PATTERN: Factory (Facade) - Provides a single simplified interface for creating objects, delegating to specialized factories.
export class ObjectFactory {
    private shapeFactory: ShapeFactory;
    private textFactory: TextFactory;

    constructor() {
        this.shapeFactory = new ShapeFactory();
        this.textFactory = new TextFactory();
    }

    public create(type: ObjectType, pointer: fabric.Point, state: ICanvasState, points?: fabric.Point[]): fabric.Object {
        switch (type) {
            case 'rect':
                return this.shapeFactory.createRectangle(pointer, state);
            case 'ellipse':
                return this.shapeFactory.createEllipse(pointer, state);
            case 'triangle':
                return this.shapeFactory.createTriangle(pointer, state);
            case 'line':
                return this.shapeFactory.createLine(pointer, state);
            case 'polygon':
                if (!points) throw new Error('Points are required for polygon creation');
                return this.shapeFactory.createPolygon(points, state);
            case 'polyline':
                if (!points) throw new Error('Points are required for polyline creation');
                return this.shapeFactory.createPolyline(points, state);
            case 'text':
                return this.textFactory.create(pointer, state);
            default:
                throw new Error(`Unknown object type: ${type}`);
        }
    }
}