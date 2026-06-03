"use client";

import { useState } from "react";

type ConfirmButtonProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  className?: string;
  onConfirm?: () => void;
  formSubmit?: boolean;
};

export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  className,
  onConfirm,
  formSubmit = false,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="grid w-full max-w-md gap-4 rounded-lg bg-white p-5 shadow-2xl">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type={formSubmit ? "submit" : "button"}
                onClick={() => {
                  if (!formSubmit) {
                    onConfirm?.();
                  }
                  setOpen(false);
                }}
                className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
