// TextFactory.ts
import { fabric } from 'fabric';
import { ICanvasState } from '../../types/types';
import { IObjectFactory } from './IObjectFactory';
import { uniqueId } from '../../utils/uniqueId';

export class TextFactory implements IObjectFactory {
    public create(pointer: fabric.Point, state: ICanvasState): fabric.IText {
        const {
            defaultFontFamily,
            defaultFontSize,
            defaultFontWeight,
            defaultFontStyle,
            defaultTextFill,
            defaultTextStroke,
            defaultTextStrokeWidth,
            isDefaultTextStrokeEnabled,
            activeLayerId
        } = state;

        const text = new fabric.IText('Text', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: defaultFontFamily,
            fontSize: defaultFontSize,
            fontWeight: defaultFontWeight as any,
            fontStyle: defaultFontStyle as any,
            fill: defaultTextFill,
            stroke: isDefaultTextStrokeEnabled ? defaultTextStroke : 'transparent',
            strokeWidth: isDefaultTextStrokeEnabled ? defaultTextStrokeWidth : 0,
            // CRITICAL: Set proper transform origin
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top',
            strokeUniform: true
        });

        text.id = uniqueId();
        text.layerId = activeLayerId || undefined;
        text.isFillEnabled = true;
        text.solidFill = defaultTextFill;
        text.isStrokeEnabled = isDefaultTextStrokeEnabled;
        text.solidStroke = defaultTextStroke;

        return text;
    }
}