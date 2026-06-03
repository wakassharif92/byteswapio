"use client";

import { ConfirmButton } from "@/components/ConfirmButton";

export function DeleteShareButton() {
  return (
    <ConfirmButton
      title="Delete share?"
      description="This cannot be recovered and the shared link will stop working immediately."
      confirmLabel="Delete"
      formSubmit
      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
    >
      Delete
    </ConfirmButton>
  );
}
