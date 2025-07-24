// Defines the interface for object factories.
import { fabric } from 'fabric';
import { ICanvasState } from '../../types/types';

// PATTERN: Factory (Interface) - The contract for classes that create fabric.Object instances.
export interface IObjectFactory {
    create(pointer: fabric.Point, state: ICanvasState): fabric.Object;
}