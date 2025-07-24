// A reusable UI component that provides a section with a title, a master toggle switch,
// and collapsible content. Used throughout the properties panels.
import React, { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ToggleSwitchProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    disabled?: boolean;
}

// A simple, reusable toggle switch component.
const ToggleSwitch = ({ enabled, onToggle, disabled }: ToggleSwitchProps) => (
    <button
        onClick={() => onToggle(!enabled)}
        disabled={disabled}
        className={`relative inline-flex items-center h-6 rounded-full w-11 duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${enabled ? 'bg-accent-primary' : 'bg-border-secondary'}`}
    >
        <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
    </button>
);

interface ToggleSectionProps {
    title: string;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    children: ReactNode;
    isCollapsible?: boolean;
    isExpanded?: boolean;
    onExpand?: () => void;
    toggleDisabled?: boolean;
}

// A container component for a section that can be enabled/disabled and optionally collapsed.
// @param title The title of the section.
// @param isEnabled Whether the section's feature is currently active.
// @param onToggle Callback to toggle the enabled state.
// @param children The content to show when the section is enabled and expanded.
// @param isCollapsible Whether the section can be collapsed.
// @param isExpanded Whether the section is currently expanded.
// @param onExpand Callback to toggle the expanded state.
// @param toggleDisabled Whether the master toggle switch should be disabled.
export const ToggleSection = ({ title, isEnabled, onToggle, children, isCollapsible = true, isExpanded = true, onExpand, toggleDisabled = false }: ToggleSectionProps) => {
    return (
        <div className="flex flex-col gap-2 border-b border-background-secondary pb-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    {isCollapsible && onExpand && (
                        <button onClick={onExpand} className="p-1 hover:bg-background-tertiary rounded">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}
                    <label className="font-semibold text-text-muted">{title}</label>
                </div>
                <ToggleSwitch enabled={isEnabled} onToggle={onToggle} disabled={toggleDisabled} />
            </div>
            {isEnabled && isExpanded && (
                <div className="pl-2 flex flex-col gap-3 pt-2">
                    {children}
                </div>
            )}
        </div>
    );
};