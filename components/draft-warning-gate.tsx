"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DraftWarningGate({ children }: { children: React.ReactNode }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <>
      <Dialog
        open={!acknowledged}
        onOpenChange={(open) => {
          if (!open) setAcknowledged(true);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Draft preview</DialogTitle>
            <DialogDescription>
              This page is an unpublished draft. It is not indexed by search
              engines and not listed anywhere on the site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAcknowledged(true)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {acknowledged && children}
    </>
  );
}
