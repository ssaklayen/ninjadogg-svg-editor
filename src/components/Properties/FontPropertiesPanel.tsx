// A reusable UI component for editing font properties.
import React from 'react';
import { Bold, Italic } from 'lucide-react';

interface FontPropertiesPanelProps {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    onFontFamilyChange: (value: string) => void;
    onFontSizeChange: (value: number) => void;
    onFontWeightChange: (value: string) => void;
    onFontStyleChange: (value: string) => void;
    onCommit: () => void;
}

export const FontPropertiesPanel = (props: FontPropertiesPanelProps) => {
    const {
        fontFamily, fontSize, fontWeight, fontStyle,
        onFontFamilyChange, onFontSizeChange, onFontWeightChange, onFontStyleChange, onCommit
    } = props;

    return (
        <div className="flex flex-col gap-3 border-b border-background-secondary pb-4">
            <div className="flex items-center justify-between">
                <label className="font-semibold text-text-muted">Font</label>
            </div>
            <div className="pl-1 flex flex-col gap-3">
                <select
                    value={fontFamily || ''}
                    onChange={e => onFontFamilyChange(e.target.value)}
                    className="w-full bg-background-secondary rounded p-1.5 text-text-primary text-xs"
                >
                    {fontFamily === undefined && <option value="" disabled>Multiple Values</option>}
                    <option>Arial</option>
                    <option>Verdana</option>
                    <option>Georgia</option>
                    <option>Times New Roman</option>
                    <option>Courier New</option>
                    <option>Impact</option>
                    <option>Comic Sans MS</option>
                </select>
                <div className="flex items-center justify-between">
                    <label className="text-text-secondary">Style</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={Math.round(fontSize || 0)}
                            onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                            onBlur={onCommit}
                            className="w-14 bg-background-secondary rounded p-1 text-text-primary text-center text-xs"
                            title="Font Size"
                            placeholder={fontSize === undefined ? 'Multi' : ''}
                        />
                        <button
                            onClick={() => onFontWeightChange(fontWeight === 'bold' ? 'normal' : 'bold')}
                            className={`p-2 rounded ${fontWeight === 'bold' ? 'bg-accent-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}
                            title="Bold"
                        >
                            <Bold size={14} />
                        </button>
                        <button
                            onClick={() => onFontStyleChange(fontStyle === 'italic' ? 'normal' : 'italic')}
                            className={`p-2 rounded ${fontStyle === 'italic' ? 'bg-accent-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}
                            title="Italic"
                        >
                            <Italic size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};