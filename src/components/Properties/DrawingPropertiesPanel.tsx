// Renders the properties panel for the active drawing tool (Pencil, Rectangle, etc.).
import React from 'react';
import { AppController } from '../../core/AppController';
import { ICanvasState, IGradientOptions } from '../../types/types';
import {
    ToggleDefaultFillCommand, ToggleDefaultGradientCommand,
    ToggleDefaultStrokeCommand, ToggleDefaultTextStrokeCommand, UpdateDrawingDefaultsCommand
} from '../../patterns/command/implementations';
import { PropertiesHeader } from './PropertiesHeader';
import { Pencil, Pen, RectangleHorizontal, Circle, Triangle, Minus, Type as TypeIcon, Stamp } from 'lucide-react';
import { FillPanel } from './FillPanel';
import { StrokePanel } from './StrokePanel';
import { FontPropertiesPanel } from './FontPropertiesPanel';

interface DrawingPropertiesPanelProps {
    controller: AppController;
    modelState: ICanvasState;
}

const toolInfo: { [key: string]: { icon: React.ReactNode, name: string } } = {
    rect: { icon: <RectangleHorizontal size={18} />, name: 'Rectangle' },
    ellipse: { icon: <Circle size={18} />, name: 'Ellipse' },
    triangle: { icon: <Triangle size={18} />, name: 'Triangle' },
    line: { icon: <Minus size={18} />, name: 'Line' },
    pencil: { icon: <Pencil size={18} />, name: 'Pencil' },
    pen: { icon: <Pen size={18} />, name: 'Pen' },
    text: { icon: <TypeIcon size={18} />, name: 'Text' },
    stamp: { icon: <Stamp size={18} />, name: 'Stamp' },
};

// Displays and edits default properties for new objects, dynamically showing
// controls based on the selected tool.
export const DrawingPropertiesPanel = ({ controller, modelState }: DrawingPropertiesPanelProps) => {
    const { activeTool } = modelState;
    const isTextTool = activeTool === 'text';
    const isPencilTool = activeTool === 'pencil';
    const isLineTool = activeTool === 'line';
    const isStampTool = activeTool === 'stamp';
    const showFill = !isPencilTool && !isLineTool && !isStampTool;

    const strokeWidthProp = isTextTool ? 'defaultTextStrokeWidth' : 'defaultShapeStrokeWidth';
    const strokeColorProp = isTextTool ? 'defaultTextStroke' : 'defaultShapeStroke';
    const isStrokeEnabledProp = isTextTool ? 'isDefaultTextStrokeEnabled' : 'isDefaultStrokeEnabled';

    const commitChanges = () => controller.saveStateToHistory();

    const updateDefaults = (props: Partial<ICanvasState>) => {
        // PATTERN: Command - Executes a command to update the model's default values.
        controller.executeCommandWithoutHistory(UpdateDrawingDefaultsCommand, props);
    };

    const handleStrokeToggle = (enabled: boolean) => {
        // PATTERN: Command - Executes the appropriate command to toggle the default stroke.
        if (isTextTool) {
            controller.executeCommand(ToggleDefaultTextStrokeCommand, enabled);
        } else {
            controller.executeCommand(ToggleDefaultStrokeCommand, enabled);
        }
    };

    const handleDefaultGradientChange = (gradient: IGradientOptions) => {
        updateDefaults({ defaultGradient: gradient });
    };

    const currentTool = toolInfo[activeTool] || { icon: <Pencil size={18} />, name: 'Tool' };

    return (
        <div className="flex flex-col gap-4 text-sm">
            <PropertiesHeader icon={currentTool.icon} title={`${currentTool.name} Properties`} />

            {isPencilTool ? (
                <StrokePanel
                    isStrokeEnabled={true}
                    onStrokeToggle={() => {}} // Pencil always has a stroke.
                    strokeColor={modelState.defaultShapeStroke}
                    onStrokeColorChange={(color) => updateDefaults({ defaultShapeStroke: color })}
                    strokeWidth={modelState.defaultShapeStrokeWidth}
                    onStrokeWidthChange={(width) => updateDefaults({ defaultShapeStrokeWidth: width })}
                    onCommit={commitChanges}
                />
            ) : isStampTool ? (
                <div className="flex flex-col gap-3 border-b border-background-secondary pb-4">
                    <div className="flex items-center justify-between">
                        <label className="font-semibold text-text-muted">Brush Size</label>
                        <input
                            type="number"
                            min="8"
                            max="512"
                            value={modelState.defaultStampSize}
                            onChange={e => updateDefaults({ defaultStampSize: parseInt(e.target.value, 10) })}
                            onBlur={commitChanges}
                            className="w-20 bg-background-secondary rounded p-1 text-text-primary text-center text-xs" />
                    </div>
                </div>
            ) : (
                <>
                    {showFill && (
                        <FillPanel
                            isFillEnabled={modelState.isDefaultFillEnabled}
                            onFillToggle={(e) => controller.executeCommand(ToggleDefaultFillCommand, e)}
                            fillType={modelState.isDefaultGradientEnabled ? 'gradient' : 'solid'}
                            onFillTypeChange={(type) => controller.executeCommand(ToggleDefaultGradientCommand, type === 'gradient')}
                            solidColor={isTextTool ? modelState.defaultTextFill : modelState.defaultSolidFill}
                            onSolidColorChange={(color) => updateDefaults({ [isTextTool ? 'defaultTextFill' : 'defaultSolidFill']: color })}
                            gradient={modelState.defaultGradient}
                            onGradientChange={handleDefaultGradientChange}
                            onGradientCommit={handleDefaultGradientChange}
                            onCommit={commitChanges}
                        />
                    )}
                    <StrokePanel
                        isStrokeEnabled={modelState[isStrokeEnabledProp]}
                        onStrokeToggle={handleStrokeToggle}
                        strokeColor={modelState[strokeColorProp]}
                        onStrokeColorChange={(color) => updateDefaults({ [strokeColorProp]: color })}
                        strokeWidth={modelState[strokeWidthProp]}
                        onStrokeWidthChange={(width) => !isNaN(width) && updateDefaults({ [strokeWidthProp]: width })}
                        onCommit={commitChanges}
                    />
                    {isTextTool && (
                        <FontPropertiesPanel
                            fontFamily={modelState.defaultFontFamily}
                            fontSize={modelState.defaultFontSize}
                            fontWeight={modelState.defaultFontWeight}
                            fontStyle={modelState.defaultFontStyle}
                            onFontFamilyChange={(value) => updateDefaults({ defaultFontFamily: value })}
                            onFontSizeChange={(value) => updateDefaults({ defaultFontSize: value })}
                            onFontWeightChange={(value) => updateDefaults({ defaultFontWeight: value })}
                            onFontStyleChange={(value) => updateDefaults({ defaultFontStyle: value })}
                            onCommit={commitChanges}
                        />
                    )}
                </>
            )}
        </div>
    );
};