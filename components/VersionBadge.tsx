"use client";

import { APP_VERSION } from "@/lib/version";

export default function VersionBadge() {
  return (
    <div className="fixed bottom-2 right-2 text-xs text-gray-400 select-none pointer-events-none z-50">
      v{APP_VERSION}
    </div>
  );
}
