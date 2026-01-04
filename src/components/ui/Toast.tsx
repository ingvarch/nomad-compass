'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, Toast as ToastType } from '@/context/ToastContext';

const Toast: React.FC<{
    toast: ToastType;
    onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    const getToastStyles = () => {
        switch (toast.type) {
            case 'success':
                return {
                    icon: <CheckCircle className="h-5 w-5" />,
                    bgColor: 'bg-green-50 dark:bg-monokai-surface',
                    borderColor: 'border-green-400 dark:border-monokai-green',
                    textColor: 'text-green-800 dark:text-monokai-green',
                    iconColor: 'text-green-500 dark:text-monokai-green'
                };
            case 'error':
                return {
                    icon: <AlertCircle className="h-5 w-5" />,
                    bgColor: 'bg-red-50 dark:bg-monokai-surface',
                    borderColor: 'border-red-400 dark:border-monokai-red',
                    textColor: 'text-red-800 dark:text-monokai-red',
                    iconColor: 'text-red-500 dark:text-monokai-red'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="h-5 w-5" />,
                    bgColor: 'bg-yellow-50 dark:bg-monokai-surface',
                    borderColor: 'border-yellow-400 dark:border-monokai-yellow',
                    textColor: 'text-yellow-800 dark:text-monokai-yellow',
                    iconColor: 'text-yellow-500 dark:text-monokai-yellow'
                };
            default:
                return {
                    icon: <Info className="h-5 w-5" />,
                    bgColor: 'bg-blue-50 dark:bg-monokai-surface',
                    borderColor: 'border-blue-400 dark:border-monokai-blue',
                    textColor: 'text-blue-800 dark:text-monokai-blue',
                    iconColor: 'text-blue-500 dark:text-monokai-blue'
                };
        }
    };

    const styles = getToastStyles();

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(toast.id);
        }, 300);
    };

    return (
        <div
            className={`${styles.bgColor} ${styles.borderColor} ${styles.textColor} border-l-4 p-4 shadow-md rounded-r mb-3 relative transform transition-all duration-300 ${
                isExiting ? 'opacity-0 translate-x-full' : 'opacity-100'
            }`}
            role="alert"
        >
            <div className="flex items-start">
                <div className={`mr-3 ${styles.iconColor}`}>{styles.icon}</div>
                <div className="flex-grow">{toast.message}</div>
                <button
                    onClick={handleClose}
                    className="ml-4 text-gray-400 hover:text-gray-600 dark:text-monokai-muted dark:hover:text-monokai-text focus:outline-none"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 w-72 max-w-full">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={removeToast} />
            ))}
        </div>
    );
};
