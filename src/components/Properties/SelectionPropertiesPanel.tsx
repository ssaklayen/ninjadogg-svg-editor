// Renders the properties panel for the currently selected object or group of objects.
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layers, Type as TypeIcon } from 'lucide-react';
import { AppController } from '../../core/AppController';
import { ICanvasState, IGradientOptions } from '../../types/types';
import { ModifyObjectCommand, SetGradientFillCommand, ToggleGradientFillCommand } from '../../patterns/command/implementations';
import { uniqueId } from '../../utils/uniqueId';
import { PropertiesHeader } from './PropertiesHeader';
import { FillPanel } from './FillPanel';
import { StrokePanel } from './StrokePanel';
import { FontPropertiesPanel } from './FontPropertiesPanel';

interface SelectionPropertiesPanelProps {
    controller: AppController;
    modelState: ICanvasState;
}

export const SelectionPropertiesPanel = ({ controller, modelState }: SelectionPropertiesPanelProps) => {
    const { selectedObjects, liveFontSize } = modelState;
    const [liveGradient, setLiveGradient] = useState<IGradientOptions | null>(null);
    const [isGroupGradientActive, setGroupGradientActive] = useState(false);

    const isGroup = selectedObjects.length > 1;
    const selectionId = useMemo(() => selectedObjects.map(obj => obj.id).join(','), [selectedObjects]);

    useEffect(() => {
        setGroupGradientActive(false);
    }, [selectionId]);

    const getInitialGradientForPicker = useCallback((): IGradientOptions | null => {
        if (selectedObjects.length === 0) return null;
        const firstObject = selectedObjects[0];
        if (firstObject.gradientFill) return firstObject.gradientFill as IGradientOptions;
        return {
            type: 'linear', coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
            colorStops: [{ id: uniqueId(), offset: 0, color: '#4facfe' }, { id: uniqueId(), offset: 1, color: '#00f2fe' }]
        };
    }, [selectedObjects]);

    useEffect(() => {
        setLiveGradient(getInitialGradientForPicker());
    }, [selectionId, getInitialGradientForPicker]);

    // Gets a common property value from all selected objects.
    // Returns undefined if values are mixed.
    const getCommonValue = useCallback((propName: string, defaultValue: any) => {
        if (selectedObjects.length === 0) return defaultValue;
        const firstValue = (selectedObjects[0] as any)[propName];
        return selectedObjects.every(obj => (obj as any)[propName] === firstValue) ? firstValue : undefined;
    }, [selectedObjects]);

    const areAllText = selectedObjects.length > 0 && selectedObjects.every(o => o.type === 'i-text');
    const fillNotApplicable = selectedObjects.every(o => o.type === 'line' && !o.isPenObject);

    const commonProps = {
        isFillEnabled: getCommonValue('isFillEnabled', true),
        solidFill: getCommonValue('solidFill', '#ffffff'),
        isGradientFillEnabled: getCommonValue('isGradientFillEnabled', false),
        isStrokeEnabled: getCommonValue('isStrokeEnabled', true),
        solidStroke: getCommonValue('solidStroke', '#000000'),
        strokeWidth: getCommonValue('strokeWidth', 1),
        fontFamily: areAllText ? getCommonValue('fontFamily', 'Arial') : undefined,
        fontSize: areAllText ? getCommonValue('fontSize', 40) : undefined,
        fontWeight: areAllText ? getCommonValue('fontWeight', 'normal') : undefined,
        fontStyle: areAllText ? getCommonValue('fontStyle', 'normal') : undefined,
    };

    // PATTERN: Command - These functions dispatch commands to modify object properties.
    const modifyLive = (props: any) => controller.executeCommandWithoutHistory(ModifyObjectCommand, props);
    const modifyAndCommit = (props: any) => controller.executeCommand(ModifyObjectCommand, props);
    const commitChanges = () => controller.saveStateToHistory();

    const handleGradientCommit = useCallback((gradient: IGradientOptions) => {
        setLiveGradient(gradient);
        controller.executeCommand(SetGradientFillCommand, gradient);
    }, [controller]);

    const handleGradientToggle = (enabled: boolean) => {
        if (isGroup) setGroupGradientActive(enabled);
        controller.executeCommand(ToggleGradientFillCommand, enabled);
    };

    const headerIcon = areAllText ? <TypeIcon size={18} /> : <Layers size={18} />;
    const headerTitle = isGroup ? `Multiple Objects (${selectedObjects.length})` : 'Selection Properties';

    return (
        <div className="flex flex-col gap-4 text-sm">
            <PropertiesHeader icon={headerIcon} title={headerTitle} />

            {!fillNotApplicable && (
                <FillPanel
                    isFillEnabled={commonProps.isFillEnabled ?? true}
                    onFillToggle={(e) => modifyAndCommit({ isFillEnabled: e })}
                    fillType={isGroup ? (isGroupGradientActive ? 'gradient' : 'solid') : (commonProps.isGradientFillEnabled ? 'gradient' : 'solid')}
                    onFillTypeChange={(type) => handleGradientToggle(type === 'gradient')}
                    solidColor={commonProps.solidFill}
                    onSolidColorChange={(color) => modifyLive({ solidFill: color })}
                    gradient={liveGradient}
                    onGradientChange={setLiveGradient}
                    onGradientCommit={handleGradientCommit}
                    onCommit={commitChanges}
                />
            )}

            <StrokePanel
                isStrokeEnabled={commonProps.isStrokeEnabled ?? true}
                onStrokeToggle={(e) => modifyAndCommit({ isStrokeEnabled: e })}
                strokeColor={commonProps.solidStroke}
                onStrokeColorChange={(color) => modifyLive({ solidStroke: color })}
                strokeWidth={commonProps.strokeWidth}
                onStrokeWidthChange={(width) => !isNaN(width) && modifyLive({ strokeWidth: width })}
                onCommit={commitChanges}
                strokeWidthPlaceholder={commonProps.strokeWidth === undefined ? 'Multi' : ''}
            />

            {areAllText && (
                <FontPropertiesPanel
                    fontFamily={commonProps.fontFamily}
                    fontSize={liveFontSize ?? commonProps.fontSize}
                    fontWeight={commonProps.fontWeight}
                    fontStyle={commonProps.fontStyle}
                    onFontFamilyChange={(value) => modifyAndCommit({ fontFamily: value })}
                    onFontSizeChange={(value) => modifyLive({ fontSize: value })}
                    onFontWeightChange={(value) => modifyAndCommit({ fontWeight: value })}
                    onFontStyleChange={(value) => modifyAndCommit({ fontStyle: value })}
                    onCommit={commitChanges}
                />
            )}
        </div>
    );
};