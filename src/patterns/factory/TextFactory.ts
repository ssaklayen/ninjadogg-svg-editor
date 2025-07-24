// Factory for creating text objects.
import { fabric } from 'fabric';
import { ICanvasState } from '../../types/types';
import { IObjectFactory } from './IObjectFactory';
import { uniqueId } from '../../utils/uniqueId';

// PATTERN: Factory (Concrete Factory) - Encapsulates the creation logic for IText objects.
export class TextFactory implements IObjectFactory {
    public create(pointer: fabric.Point, state: ICanvasState): fabric.IText {
        const {
            activeLayerId, defaultFontFamily, defaultFontSize, defaultFontWeight, defaultFontStyle,
            defaultTextFill, isDefaultGradientEnabled, defaultGradient, isDefaultFillEnabled,
            isDefaultTextStrokeEnabled, defaultTextStroke, defaultTextStrokeWidth
        } = state;

        const text = new fabric.IText('Your Text Here', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: defaultFontFamily,
            fontSize: defaultFontSize,
            fontWeight: defaultFontWeight,
            fontStyle: defaultFontStyle,
            dirty: true,
            id: uniqueId(),
            layerId: activeLayerId || undefined,

            isFillEnabled: isDefaultFillEnabled,
            solidFill: defaultTextFill,
            isGradientFillEnabled: isDefaultGradientEnabled,
            gradientFill: defaultGradient,

            isStrokeEnabled: isDefaultTextStrokeEnabled,
            stroke: isDefaultTextStrokeEnabled ? defaultTextStroke : 'transparent',
            strokeWidth: defaultTextStrokeWidth,
            solidStroke: defaultTextStroke,
        } as any);

        return text;
    }
}