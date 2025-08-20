

"use client";

import { useEffect } from "react";

export default function CleanUrlClient() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.search) {
        window.history.replaceState({}, "", url.pathname);
      }
    }
  }, []);

  return null;
}