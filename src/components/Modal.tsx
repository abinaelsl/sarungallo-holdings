"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-8">
        <div
          className="card animate-fade-in w-full max-w-lg my-auto"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-lg text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
