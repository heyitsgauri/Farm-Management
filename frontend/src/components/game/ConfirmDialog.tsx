import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, body, confirmLabel, onConfirm, onCancel }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-[80] bg-[#3b2412]/50 backdrop-blur-sm grid place-items-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          className="panel max-w-sm w-full p-6 text-center"
          initial={{ scale: 0.7, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display font-bold text-2xl text-[#3b2412] mb-2">{title}</h3>
          <p className="text-[#6b4f36] mb-5">{body}</p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-cream" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-berry" onClick={onConfirm} autoFocus>
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
