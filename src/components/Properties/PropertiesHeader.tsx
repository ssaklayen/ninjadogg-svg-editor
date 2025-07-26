// A reusable header component for the properties panels, displaying an icon and title.
import React from 'react';

interface PropertiesHeaderProps {
    icon: React.ReactNode;
    title: string;
}

export const PropertiesHeader = ({ icon, title }: PropertiesHeaderProps) => (
    <div draggable="false" className="flex items-center gap-3 p-2 border-b border-border-primary mb-4">
        <div draggable="false" className="text-accent-secondary">
            {icon}
        </div>
        <h2 className="text-md font-semibold text-text-primary select-none">{title}</h2>
    </div>
);