"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ErrorOverlay = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorData, setErrorData] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    const error = searchParams.get("error");

    if (status === "canceled") {
      setErrorData({
        title: "Checkout Canceled",
        message:
          "No worries! Your spot is still reserved. Whenever you're ready to join, we'll be here.",
      });
    } else if (error) {
      let title = "Oops! Something went wrong";
      let message =
        "Something went wrong during checkout. Please try again or reach out if the issue persists.";
      if (error === "session_expired") {
        message =
          "Your session has expired. Please log in again to continue.";
      } else if (error === "not_subscribed") {
        title = "Subscription required";
        message =
          "You need an active subscription to access the course roadmap. Subscribe below to get started.";
      }

      setErrorData({ title, message });
    } else {
      setErrorData(null);
    }
  }, [searchParams]);

  const handleClose = () => {
    setErrorData(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    url.searchParams.delete("error");
    router.push(url.pathname, { scroll: false });
  };

  return (
    <Dialog open={!!errorData} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{errorData?.title}</DialogTitle>
          <DialogDescription>{errorData?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button asChild>
            <a href="mailto:arthur@tap-and-swipe.com">Need help?</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorOverlay;
