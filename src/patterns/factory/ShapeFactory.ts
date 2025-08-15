// Factory for creating basic shape objects (Rect, Ellipse, etc.).
import { fabric } from 'fabric';
import { ICanvasState } from '../../types/types';
import { uniqueId } from '../../utils/uniqueId';

// PATTERN: Factory (Concrete Factory) - Encapsulates the creation logic for geometric shapes.
export class ShapeFactory {

    private _applyDefaults(shape: fabric.Object, state: ICanvasState) {
        const { isDefaultFillEnabled, defaultSolidFill, defaultShapeStroke, defaultShapeStrokeWidth, isDefaultGradientEnabled, defaultGradient, activeLayerId, isDefaultStrokeEnabled } = state;

        shape.isFillEnabled = isDefaultFillEnabled;
        shape.solidFill = defaultSolidFill;
        shape.isGradientFillEnabled = isDefaultGradientEnabled;
        shape.gradientFill = defaultGradient;

        shape.isStrokeEnabled = isDefaultStrokeEnabled;
        shape.stroke = isDefaultStrokeEnabled ? defaultShapeStroke : 'transparent';
        shape.strokeWidth = defaultShapeStrokeWidth;
        shape.solidStroke = defaultShapeStroke;

        shape.id = uniqueId();
        shape.layerId = activeLayerId || undefined;

        // CRITICAL: Set proper transform origin for all shapes
        shape.set({
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });
    }

    public createRectangle(pointer: fabric.Point, state: ICanvasState): fabric.Rect {
        const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });
        this._applyDefaults(rect, state);
        return rect;
    }

    public createEllipse(pointer: fabric.Point, state: ICanvasState): fabric.Ellipse {
        const ellipse = new fabric.Ellipse({
            left: pointer.x,
            top: pointer.y,
            rx: 0,
            ry: 0,
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });
        this._applyDefaults(ellipse, state);
        return ellipse;
    }

    public createTriangle(pointer: fabric.Point, state: ICanvasState): fabric.Triangle {
        const triangle = new fabric.Triangle({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });
        this._applyDefaults(triangle, state);
        return triangle;
    }

    public createLine(pointer: fabric.Point, state: ICanvasState): fabric.Line {
        const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });

        line.isStrokeEnabled = state.isDefaultStrokeEnabled;
        line.stroke = state.isDefaultStrokeEnabled ? state.defaultShapeStroke : 'transparent';
        line.strokeWidth = state.defaultShapeStrokeWidth;
        line.solidStroke = state.defaultShapeStroke;
        line.id = uniqueId();
        line.layerId = state.activeLayerId || undefined;
        return line;
    }

    public createPolygon(points: fabric.Point[], state: ICanvasState): fabric.Polygon {
        const polygon = new fabric.Polygon(points, {
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });
        this._applyDefaults(polygon, state);
        return polygon;
    }

    public createPolyline(points: fabric.Point[], state: ICanvasState): fabric.Polyline {
        const polyline = new fabric.Polyline(points, {
            fill: '',
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });
        this._applyDefaults(polyline, state);
        polyline.isFillEnabled = false;
        polyline.solidFill = '';
        polyline.isGradientFillEnabled = false;
        polyline.gradientFill = null;
        return polyline;
    }
}