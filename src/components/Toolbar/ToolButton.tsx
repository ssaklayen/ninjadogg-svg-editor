// A simple, reusable button component for the main toolbar.
import React from 'react';

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    toolName: string;
    activeTool: string;
    onClick: () => void;
}

export const ToolButton = ({icon, label, toolName, activeTool, onClick}: ToolButtonProps) => (
    <button onClick={onClick}
            className={`p-3 rounded-lg w-full flex justify-center items-center ${activeTool === toolName ? 'bg-accent-primary text-text-primary' : 'hover:bg-background-tertiary text-text-muted'}`}
            title={label}>{icon}</button>
);