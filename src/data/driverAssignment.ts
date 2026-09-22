import type { AssignedRoute } from "@/types/driver";

/** Keyed by driver userId — what route/bus that driver is assigned today. */
export const driverAssignments: Record<string, AssignedRoute> = {
  conductor: {
    driverId: "conductor",
    busId: "6",
    placa: "TLM-1006",
    troncal: "Troncal Caracas",
    turno: "Turno mañana",
    horaSalida: "06:30 AM",
  },
  conductor2: {
    driverId: "conductor2",
    busId: "8",
    placa: "TLM-1008",
    troncal: "Calle 26",
    turno: "Turno mañana",
    horaSalida: "06:45 AM",
  },
};
