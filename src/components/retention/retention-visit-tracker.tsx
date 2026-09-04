"use client";

import { useEffect } from "react";
import { recordDailyVisit } from "@/lib/cosmos-retention";

export function RetentionVisitTracker() {
  useEffect(() => {
    recordDailyVisit();
  }, []);

  return null;
}
