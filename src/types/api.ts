/** Formas que devuelve el back (ver SitpVerseBack/docs/API.md). Los mappers las traducen a los tipos del front. */
export type ApiRole = "ADMIN" | "DRIVER" | "MECHANICAL";

export interface ApiUser {
  id: string;
  employeeId: string;
  name: string;
  role: ApiRole;
  active?: boolean;
}

export interface ApiBus {
  id: string;
  plate: string;
  route: string;
  status: "IDLE" | "IN_SERVICE" | "FINISHED";
  latitude: number | string | null;
  longitude: number | string | null;
  locationLabel: string | null;
  model: string | null;
  year: number | null;
  operator: string | null;
  capacity: number | null;
  driverId: string | null;
  driver: string | null;
  tripStartedAt: string | null;
  /** Foto real del bus (`/uploads/…`); la sube el administrador. */
  photoUrl: string | null;
  updatedAt: string;
}

export interface ApiFleetSummary {
  total: number;
  inService: number;
  idle: number;
  finished: number;
}

export interface ApiAssistanceSummary {
  incidentsLast24h: number;
  openSupportCalls: number;
  openRepairCalls: number;
  repairsInProgress: number;
  repairsCompletedLast24h: number;
  openBlockages: number;
}

export interface ApiOperativeHome {
  busId: string;
  plate: string;
  route: string;
  status: string;
  hasActiveTrip: boolean;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export interface ApiClaim {
  id: string;
  userId: string;
  userName: string;
  status: "ACTIVE" | "CANCELLED";
  arriveBy: string;
  overdue: boolean;
  createdAt: string;
}

export interface ApiCall {
  id: string;
  kind: "DRIVER_SUPPORT" | "REPAIR";
  incidentId: string | null;
  busId: string;
  slots: number;
  claimedCount: number;
  rewardPoints: number;
  status: "OPEN" | "FILLED" | "COMPLETED";
  description: string | null;
  createdAt: string;
  completedAt: string | null;
  claims: ApiClaim[];
  bus: {
    id: string;
    plate: string;
    route: string;
    locationLabel: string | null;
    latitude: number | null;
    longitude: number | null;
    driverName: string | null;
  } | null;
  incident: {
    id: string;
    type: string;
    description: string | null;
    reportedByName: string | null;
    createdAt: string;
  } | null;
}

export interface ApiIncident {
  id: string;
  busId: string;
  reportedById: string;
  reportedByName: string | null;
  type: string;
  description: string | null;
  status: "REPORTED" | "HELP_REQUESTED";
  createdAt: string;
}

export interface ApiRepairReport {
  id: string;
  callId: string;
  mechanicId: string;
  mechanicName: string;
  damages: string;
  replacedParts: string;
  expenses: { concepto: string; valor: number }[];
  busPhotos: string[];
  partPhotos: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ApiInspection {
  id: string;
  busId: string;
  inspectorName: string;
  inspectorRole: string;
  note: string;
  comment: string | null;
  photos: string[];
  createdAt: string;
}
