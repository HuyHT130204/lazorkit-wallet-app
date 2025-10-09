'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface ViewportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
}

export const ViewportModal = ({
  open,
  onOpenChange,
  children,
  title,
  className,
  overlayClassName,
  showCloseButton = true,
}: ViewportModalProps) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm',
            'flex items-center justify-center',
            'p-4', // Add padding for mobile
            overlayClassName
          )}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className={cn(
              'bg-background relative w-full max-w-md max-h-[85vh]',
              'rounded-xl border shadow-2xl',
              'flex flex-col', // Make it a flex container
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-6 pb-4 border-b">
                <h2 className="text-xl font-semibold">{title}</h2>
                {showCloseButton && (
                  <button
                    onClick={() => onOpenChange(false)}
                    className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <XIcon className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </button>
                )}
              </div>
            )}

            {/* Content - No scroll, compact layout */}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
