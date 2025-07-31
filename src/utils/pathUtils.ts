import { fabric } from 'fabric';
import { IAnchorPoint } from '../types/types';

/**
 * Ensures that anchor data coordinates are fabric.Point instances.
 * This function takes raw anchor data, which might come from JSON serialization
 * (and thus contain plain {x, y} objects), and "hydrates" it into the
 * IAnchorPoint[] type required for runtime calculations, where each coordinate
 * is a true fabric.Point instance.
 *
 * @param data - An array of anchor point data, possibly with plain object coordinates.
 * @returns A new array of IAnchorPoint where all coordinates are fabric.Point instances.
 */
export function hydrateAnchorData(data: any[] | undefined | null): IAnchorPoint[] {
    if (!data) {
        return [];
    }

    return data.map(p => ({
        anchor: new fabric.Point(p.anchor.x, p.anchor.y),
        handle1: new fabric.Point(p.handle1.x, p.handle1.y),
        handle2: new fabric.Point(p.handle2.x, p.handle2.y),
    }));
}