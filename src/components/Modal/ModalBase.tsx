/**
 * A reusable base component for all modal dialogs in the application.
 * It provides the dark overlay and the centered panel, handling the
 * "click outside to close" functionality.
 */
import React, { ReactNode } from 'react';

interface ModalBaseProps {
    children: ReactNode;
    onClose?: () => void;
    widthClass?: string;
}

/**
 * A generic wrapper for modal dialogs.
 * @param children The content to be rendered inside the modal.
 * @param onClose Callback function to execute when the modal should be closed.
 * @param widthClass Optional Tailwind CSS class to control the modal's width.
 */
export const ModalBase = ({ children, onClose, widthClass = 'max-w-lg' }: ModalBaseProps) => {
    return (
        <div
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) {
                    onClose();
                }
            }}
        >
            <div
                className={`bg-background-secondary p-8 rounded-lg shadow-2xl text-text-primary w-full ${widthClass}`}
                // Prevents the modal from closing when its inner content is clicked.
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};