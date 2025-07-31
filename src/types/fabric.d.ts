import 'fabric';
import { IAnchorPoint, IGradientOptions } from './types';

declare module 'fabric' {
    namespace fabric {
        interface IObjectOptions {
            isPreviewObject?: boolean;
            isArtboard?: boolean;
            isPenHandle?: boolean;
            handleData?: { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' };
        }

        interface Object {
            id?: string;
            layerId?: string;
            isGridLine?: boolean;
            isArtboard?: boolean;
            isLayerBackground?: boolean;
            isPreviewObject?: boolean;
            customPathData?: any;

            isFillEnabled?: boolean;
            solidFill?: string;
            isGradientFillEnabled?: boolean;
            gradientFill?: IGradientOptions | null;

            isStrokeEnabled?: boolean;
            solidStroke?: string;

            isPenHandle?: boolean;
            handleData?: { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' };

            isPenObject?: boolean;
            isPathClosed?: boolean;
            anchorData?: IAnchorPoint[];

            // FIX: Add missing property declaration
            stopEventPropagation?: boolean;

            // Temporary property for transformation tracking
            _originalPathOffset?: Point;

            fill: string | Pattern | Gradient;
            stroke: string | Pattern | Gradient;
        }

        interface Path {
            // Properties are inherited from fabric.Object
        }

        interface Canvas {
            isDragging?: boolean;
        }
        interface IEvent<E extends Event = Event> {
            selected?: Object[];
        }
        interface Group {
            _restoreObjectsState(): void;
            getObjects(): Object[];
        }

        // ADD THIS NEW INTERFACE
        interface IUtil {
            calcBoundsOfPoints(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number };
            transformPoint(point: Point, transform: number[]): Point;
            invertTransform(transform: number[]): number[];
        }

        // Export util as a const with IUtil interface
        const util: IUtil;

        // Define Matrix type
        type Matrix = number[];
    }
}