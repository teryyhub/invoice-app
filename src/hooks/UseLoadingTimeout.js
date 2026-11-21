// src/hooks/useLoadingTimeout.js
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useLoadingTimeout(isLoading, timeoutSeconds = 10) {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setIsTimedOut(true);
        toast.error("Loading took too long. Force restarting app...");
        
        // Brief pause to let the toast display before reloading the web-view / app
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }, timeoutSeconds * 1000);
    } else {
      setIsTimedOut(false);
    }

    return () => clearTimeout(timer);
  }, [isLoading, timeoutSeconds]);

  return isTimedOut;
}