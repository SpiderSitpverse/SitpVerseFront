import { useEffect, useState } from "react";
import { repairClient } from "@/lib/repairClient";
import type { RepairReport, RepairRequest } from "@/types/repair";

export function useRepairRequests(): RepairRequest[] {
  const [requests, setRequests] = useState<RepairRequest[]>(() => repairClient.getRequests());

  useEffect(() => {
    return repairClient.subscribe(() => setRequests(repairClient.getRequests()));
  }, []);

  return requests;
}

export function useRepairReports(): RepairReport[] {
  const [reports, setReports] = useState<RepairReport[]>(() => repairClient.getReports());

  useEffect(() => {
    return repairClient.subscribe(() => setReports(repairClient.getReports()));
  }, []);

  return reports;
}
