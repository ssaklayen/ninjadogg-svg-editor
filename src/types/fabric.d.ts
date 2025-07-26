import 'fabric';
import { IGradientOptions } from './types';

declare module 'fabric' {
    namespace fabric {
        interface IObjectOptions {
            isPreviewObject?: boolean;
            isArtboard?: boolean;
        }

        interface Object {
            id?: string;
            layerId?: string;
            isGridLine?: boolean;
            isArtboard?: boolean;
            isLayerBackground?: boolean; // New property for internal tracking
            isPreviewObject?: boolean;
            customPathData?: any;

            // Custom properties for robust state management
            isFillEnabled?: boolean;
            solidFill?: string;
            isGradientFillEnabled?: boolean;
            gradientFill?: IGradientOptions | null;

            isStrokeEnabled?: boolean;
            solidStroke?: string;

            // Keep original fill/stroke for Fabric's internal use.
            // Our controller will now manage these based on the custom properties above.
            fill: string | Pattern | Gradient;
            stroke: string | Pattern | Gradient;
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
    }
}