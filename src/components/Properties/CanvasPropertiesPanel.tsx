/**
 * Renders the properties panel specifically for the canvas itself.
 * This panel is shown when no objects are selected, allowing the user
 * to edit the canvas background (solid color, gradient, or transparent).
 */
import React, { useCallback } from 'react';
import { AppController } from '../../core/AppController';
import { ICanvasState, IGradientOptions } from '../../types/types';
import { SetCanvasSolidColorCommand, ToggleCanvasGradientCommand, SetCanvasGradientCommand, ToggleTransparencyCommand } from '../../patterns/command/implementations';
import { PropertiesHeader } from './PropertiesHeader';
import { Frame as CanvasIcon } from 'lucide-react';
import { FillPanel } from './FillPanel';

interface CanvasPropertiesPanelProps {
    controller: AppController;
    modelState: ICanvasState;
}

/**
 * The main component for displaying and editing global canvas properties.
 * @param controller The main application controller.
 * @param modelState The current state from the model.
 */
export const CanvasPropertiesPanel = ({ controller, modelState }: CanvasPropertiesPanelProps) => {
    const { isTransparent, canvasSolidColor, isCanvasGradientEnabled, canvasGradient } = modelState;

    const handleGradientCommit = useCallback((newGradient: IGradientOptions) => {
        // PATTERN: Command
        controller.executeCommand(SetCanvasGradientCommand, newGradient);
    }, [controller]);

    const handleFillToggle = (enabled: boolean) => {
        // PATTERN: Command
        controller.executeCommand(ToggleTransparencyCommand, !enabled);
    };

    const handleFillTypeChange = (type: 'solid' | 'gradient') => {
        // PATTERN: Command
        controller.executeCommand(ToggleCanvasGradientCommand, type === 'gradient');
    };

    const handleSolidColorChange = (color: string) => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(SetCanvasSolidColorCommand, color);
    };

    /**
     * Commits the current state to the history stack (e.g., after a color change is final).
     */
    const handleCommit = () => {
        controller.saveStateToHistory();
    }

    const isFillEnabled = !isTransparent;
    const fillType = isCanvasGradientEnabled ? 'gradient' : 'solid';

    return (
        <>
            <PropertiesHeader icon={<CanvasIcon size={18} />} title="Canvas Properties" />
            <FillPanel
                isFillEnabled={isFillEnabled}
                onFillToggle={handleFillToggle}
                fillType={fillType}
                onFillTypeChange={handleFillTypeChange}
                solidColor={canvasSolidColor || '#ffffff'}
                onSolidColorChange={handleSolidColorChange}
                gradient={canvasGradient || modelState.defaultGradient}
                onGradientChange={handleGradientCommit}
                onGradientCommit={handleGradientCommit}
                onCommit={handleCommit}
            />
        </>
    );
};