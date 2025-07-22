"use client";

import React from "react";
import { useQuota } from "./ReadQuotaContext";

type Props = {
  className?: string;
};

const ReadQuotaBanner: React.FC<Props> = ({ className }) => {
  const quota = useQuota();
  if (!quota) return null; // handle null/undefined from context safely
  const { remaining, limit, paywalled } = quota;
  const safeRemaining = remaining ?? 0;

  // Hide if unlimited or already subscribed
  if (limit === 0 || paywalled === false) return null;

  return (
    <div
      role="alert"
      className={
        className ??
        "mb-4 rounded-md bg-yellow-100 px-4 py-3 text-sm text-yellow-800"
      }
    >
      {safeRemaining > 0 ? (
        <p>
          You have <strong>{safeRemaining}</strong> free story
          {safeRemaining === 1 ? "" : "ies"} left today (out of {limit}).{" "}
          <a href="/pricing" className="underline hover:no-underline font-medium">
            Go unlimited
          </a>
          .
        </p>
      ) : (
        <p>
          You’ve hit your free limit for today.{" "}
          <a href="/pricing" className="underline hover:no-underline font-medium">
            Upgrade to keep reading
          </a>
          .
        </p>
      )}
    </div>
  );
};

export default ReadQuotaBanner;