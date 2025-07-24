// A custom React hook to manage the color picker's visibility and handling outside clicks.
import { useState, useEffect, useRef } from 'react';

export const useColorPicker = (onClose: () => void) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const pickerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const openPicker = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX,
            });
        }
        setIsOpen(true);
    };

    const closePicker = () => {
        onClose();
        setIsOpen(false);
    }

    return { isOpen, openPicker, closePicker, pickerRef, triggerRef, position };
};