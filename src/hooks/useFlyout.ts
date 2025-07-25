// A custom React hook to manage the state and interactions for a flyout menu.
import { useState, useEffect, useRef } from 'react';

interface UseFlyoutResult {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    dropdownRef: React.RefObject<HTMLDivElement>;
    getButtonProps: (
        onClick: () => void,
        delay?: number
    ) => {
        onMouseDown: () => void;
        onMouseUp: () => void;
        onMouseLeave: () => void;
    };
}

export const useFlyout = (): UseFlyoutResult => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getButtonProps = (
        onClick: () => void,
        delay: number = 400
    ) => {
        const handleMouseDown = () => {
            pressTimer.current = setTimeout(() => {
                setIsOpen(true);
                pressTimer.current = null;
            }, delay);
        };

        const handleMouseUp = () => {
            if (pressTimer.current) {
                clearTimeout(pressTimer.current);
                pressTimer.current = null;
                if (isOpen) {
                    setIsOpen(false);
                } else {
                    onClick();
                }
            }
        };

        const handleMouseLeave = () => {
            if (pressTimer.current) {
                clearTimeout(pressTimer.current);
                pressTimer.current = null;
            }
        };

        return {
            onMouseDown: handleMouseDown,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
        };
    };

    return { isOpen, setIsOpen, dropdownRef, getButtonProps };
};