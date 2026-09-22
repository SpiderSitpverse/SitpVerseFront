import { useEffect, useState } from "react";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import type { ActiveTrip, HelpRequest } from "@/types/driver";

export function useActiveTrips(): ActiveTrip[] {
  const [trips, setTrips] = useState<ActiveTrip[]>(() => fleetActivityClient.getActiveTrips());

  useEffect(() => {
    return fleetActivityClient.subscribe(() => setTrips(fleetActivityClient.getActiveTrips()));
  }, []);

  return trips;
}

export function useHelpRequests(): HelpRequest[] {
  const [requests, setRequests] = useState<HelpRequest[]>(() => fleetActivityClient.getHelpRequests());

  useEffect(() => {
    return fleetActivityClient.subscribe(() => setRequests(fleetActivityClient.getHelpRequests()));
  }, []);

  return requests;
}
