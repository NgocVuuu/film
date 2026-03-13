'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BottomSheet - A mobile-first drawer component that slides up from the bottom.
 * Uses Radix UI Dialog primitive for accessibility.
 */
interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    showClose?: boolean;
    fullHeight?: boolean;
    noPadding?: boolean;
}

export function BottomSheet({
    isOpen,
    onClose,
    title,
    children,
    className,
    showClose = true,
    fullHeight = false,
    noPadding = false
}: BottomSheetProps) {
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Overlay with subtle blur */}
                <DialogPrimitive.Overlay 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
                />
                
                {/* Content - Slides from bottom */}
                <DialogPrimitive.Content
                    className={cn(
                        /* Base: stick to bottom, full width, rounded top corners */
                        "fixed left-0 right-0 z-50 flex flex-col bg-[#080808] border-t border-white/5 shadow-2xl outline-none",
                        fullHeight ? "top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0" : "bottom-0",
                       /* Animations: slide from bottom */
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300 ease-out",
                        /* Shape & Size: Max height 85% to keep context of background, or full height */
                        fullHeight ? "rounded-none" : "rounded-t-[2.5rem] max-h-[85vh] overflow-hidden pb-[env(safe-area-inset-bottom)]",
                        className
                    )}
                >
                    {/* Pull handler / Indicator for mobile feel - Hide when full height */}
                    {!fullHeight && <div className="mx-auto mt-4 h-1 w-10 shrink-0 rounded-full bg-white/5" />}

                    {/* Header */}
                    {(title || showClose) && (
                        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                            {title && (
                                <DialogPrimitive.Title className="text-lg font-bold text-white tracking-tight">
                                    {title}
                                </DialogPrimitive.Title>
                            )}
                            {showClose && (
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Body - Scrollable content area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className={cn(noPadding ? "p-0 flex-1 flex flex-col" : "p-5")}>
                            {children}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

/**
 * Usage Example:
 * <BottomSheet isOpen={isOpen} onClose={() => setOpen(false)} title="Movie Details">
 *   <p>Content goes here...</p>
 * </BottomSheet>
 */
