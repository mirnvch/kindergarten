"use client";

import { useEffect, useRef } from "react";
import { trackPageView, trackEvent } from "@/server/actions/analytics";

// Generate or get session ID from localStorage
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

// Determine source from URL params
function getSource(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get("utm_source");
  if (utm_source) return utm_source;

  const ref = params.get("ref");
  if (ref) return ref;

  return undefined;
}

interface PageViewTrackerProps {
  daycareId: string;
}

export function PageViewTracker({ daycareId }: PageViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return;
    tracked.current = true;

    const sessionId = getSessionId();
    if (!sessionId) return;

    trackPageView({
      daycareId,
      path: window.location.pathname,
      sessionId,
      referrer: document.referrer || undefined,
      source: getSource(),
    });
  }, [daycareId]);

  return null;
}

interface EventTrackerProps {
  children: React.ReactNode;
  daycareId?: string;
  eventType: string;
  eventData?: Record<string, string | number | boolean | null>;
  asChild?: boolean;
}

export function EventTracker({
  children,
  daycareId,
  eventType,
  eventData,
}: EventTrackerProps) {
  const handleClick = () => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackEvent({
      daycareId,
      sessionId,
      eventType,
      eventData,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  };

  return (
    <div onClick={handleClick} className="contents">
      {children}
    </div>
  );
}

// Hook for tracking events programmatically
export function useAnalytics() {
  const track = (eventType: string, data?: { daycareId?: string; eventData?: Record<string, string | number | boolean | null> }) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackEvent({
      daycareId: data?.daycareId,
      sessionId,
      eventType,
      eventData: data?.eventData,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  };

  return { track };
}
