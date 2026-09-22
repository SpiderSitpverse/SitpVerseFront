import type { Bus, BusReport, Incident } from "@/types/bus";

export const fleetSummary = {
  total: 2845,
  enOperacion: 2418,
  incidentesHoy: 14,
};

export const buses: Bus[] = [
  { id: "1", placa: "TLM-1001", troncal: "Troncal Caracas", ubicacion: "Calle 26", estado: "operacion" },
  { id: "2", placa: "TLM-1002", troncal: "Av. Calle 26", ubicacion: "Portal Eldorado", estado: "operacion" },
  { id: "3", placa: "TLM-1003", troncal: "Calle 80", ubicacion: "Escuela Militar", estado: "operacion" },
  { id: "4", placa: "TLM-1004", troncal: "Troncal NQS", ubicacion: "Patio Portal Sur", estado: "mantenimiento" },
  { id: "5", placa: "TLM-1005", troncal: "Av. Suba", ubicacion: "Humedal Córdoba", estado: "operacion" },
  { id: "6", placa: "TLM-1006", troncal: "Troncal Caracas", ubicacion: "Calle 72", estado: "operacion" },
  { id: "7", placa: "TLM-1007", troncal: "Patio Portal", ubicacion: "Patio Portal Norte", estado: "fuera-servicio" },
  { id: "8", placa: "TLM-1008", troncal: "Calle 26", ubicacion: "Quinta Paredes", estado: "operacion" },
];

export const registryBuses: Bus[] = [
  { id: "842", placa: "TLY-842", troncal: "F76", ubicacion: "Patio Fontibón", estado: "operacion", modelo: "Marcopolo Viale BRS", anio: 2020, operador: "Consorcio Express S.A.S.", capacidad: 160 },
  { id: "843", placa: "TLY-843", troncal: "B23", ubicacion: "Autopista Norte", estado: "operacion", modelo: "Marcopolo Viale BRS", anio: 2021, operador: "Consorcio Express S.A.S.", capacidad: 160 },
  { id: "844", placa: "TLY-844", troncal: "B18", ubicacion: "Av. 26", estado: "operacion", modelo: "Biarticulado Volvo", anio: 2019, operador: "Este es Mi Bus S.A.S.", capacidad: 270 },
  {
    id: "845",
    placa: "TLY-845",
    troncal: "Troncal Caracas (H3)",
    ubicacion: "Patio Portal Usme",
    estado: "mantenimiento",
    modelo: "Marcopolo Viale BRS",
    anio: 2021,
    operador: "Consorcio Express S.A.S.",
    capacidad: 160,
  },
  { id: "846", placa: "TLY-846", troncal: "B11", ubicacion: "Cra. 10 / Calle 26", estado: "operacion", modelo: "Biarticulado Scania", anio: 2020, operador: "Consorcio Express S.A.S.", capacidad: 270 },
  { id: "847", placa: "TLY-847", troncal: "C35", ubicacion: "Talleres Fontibón", estado: "fuera-servicio", modelo: "Padrón Volvo", anio: 2018, operador: "Este es Mi Bus S.A.S.", capacidad: 90 },
  { id: "848", placa: "TLY-848", troncal: "B10", ubicacion: "Av. Caracas / Calle 45", estado: "operacion", modelo: "Marcopolo Viale BRS", anio: 2021, operador: "Consorcio Express S.A.S.", capacidad: 160 },
];

export const busReports: Record<string, BusReport> = {
  "1": {
    nombre: "Miguel Ángel Rojas",
    rol: "Conductor",
    fecha: "15/09/2026 · 06:42 AM",
    nota: "Inspección de turno sin novedades.",
    comentario:
      "El bus se recibió con niveles de aceite y presión de neumáticos dentro de rango. Se hizo inspección visual de carrocería, puertas y sistema de frenos sin encontrar anomalías. La unidad quedó habilitada para el turno con normalidad.",
    fotos: ["Inspección de carrocería", "Panel de instrumentos", "Estado de neumáticos"],
  },
  "2": {
    nombre: "Laura Gómez",
    rol: "Supervisora de patio",
    fecha: "15/09/2026 · 05:58 AM",
    nota: "Revisión de frenos completada.",
    comentario:
      "El bus llegó reportando ruido en el sistema de frenado del eje trasero. Se envió a mantenimiento correctivo, donde se identificó desgaste avanzado en las pastillas traseras. Se realizó el cambio de pastillas y purga del sistema hidráulico; la unidad salió con la corrección aplicada y prueba de frenado aprobada. En las fotos se evidencia el estado de las pastillas antes y después del cambio.",
    fotos: ["Pastillas desgastadas", "Cambio de pastillas en taller", "Prueba de frenado final"],
  },
  "3": {
    nombre: "Jorge Andrés Peña",
    rol: "Conductor",
    fecha: "14/09/2026 · 09:15 PM",
    nota: "Cambio de turno, unidad en buen estado.",
    comentario:
      "El vehículo se recibió en buen estado general para el cambio de turno. No se reportaron novedades mecánicas ni en el interior de la unidad.",
    fotos: ["Interior de la unidad", "Panel de instrumentos"],
  },
  "4": {
    nombre: "Camilo Torres",
    rol: "Técnico de mantenimiento",
    fecha: "14/09/2026 · 03:20 PM",
    nota: "Ingreso a taller por revisión preventiva.",
    comentario:
      "El bus ingresó a taller por mantenimiento preventivo programado. Se realizó cambio de filtros y revisión del sistema eléctrico. Durante el diagnóstico se detectó desgaste leve en los amortiguadores delanteros, programado para reemplazo en el próximo mantenimiento. Las fotos muestran los filtros retirados y el estado de la suspensión.",
    fotos: ["Filtros retirados", "Diagnóstico de suspensión", "Revisión eléctrica"],
  },
  "5": {
    nombre: "María Fernanda Ríos",
    rol: "Despachadora",
    fecha: "15/09/2026 · 06:10 AM",
    nota: "Salida a ruta confirmada.",
    comentario:
      "Se verificaron documentos de la unidad y estado general antes de la salida. Sin novedades para reportar; el bus salió a ruta a la hora programada.",
    fotos: ["Verificación de salida"],
  },
  "6": {
    nombre: "Andrés Felipe Cuéllar",
    rol: "Conductor",
    fecha: "15/09/2026 · 06:35 AM",
    nota: "Inspección visual aprobada.",
    comentario: "Inspección visual de rutina aprobada sin observaciones. Unidad lista para operación en la troncal Caracas.",
    fotos: ["Inspección visual", "Estado de neumáticos"],
  },
  "7": {
    nombre: "Camilo Torres",
    rol: "Técnico de mantenimiento",
    fecha: "13/09/2026 · 11:40 AM",
    nota: "Unidad fuera de servicio por falla eléctrica.",
    comentario:
      "El bus fue retirado de operación por falla eléctrica en el sistema de iluminación interior y el tablero de instrumentos. Se encuentra en taller a la espera de repuestos para el módulo de control. Las fotos evidencian el cableado afectado y el diagnóstico preliminar.",
    fotos: ["Cableado afectado", "Diagnóstico del módulo", "Tablero de instrumentos"],
  },
  "8": {
    nombre: "Laura Gómez",
    rol: "Supervisora de patio",
    fecha: "15/09/2026 · 05:50 AM",
    nota: "Aseo y revisión general realizada.",
    comentario:
      "Se realizó aseo general y revisión de niveles de fluidos. La unidad no presentó novedades y quedó lista para el siguiente turno.",
    fotos: ["Aseo general", "Revisión de fluidos"],
  },
};

export const incidents: Incident[] = [
  {
    id: "1",
    titulo: "Incidente en vía",
    descripcion: "Bus 4321 - Accidente leve en Av. Caracas con Calle 72.",
    severidad: "critico",
    hace: "Hace 12 min",
    rutasAlternas: ["Troncal NQS", "Av. Suba", "Calle 80"],
    instruccionesSugeridas: [
      "Desviar por la Av. Caracas hacia la Troncal NQS",
      "Reducir velocidad y mantener distancia de seguridad",
      "Informar a los pasajeros el desvío por altavoz",
    ],
  },
  {
    id: "2",
    titulo: "Falla mecánica",
    descripcion: "Bus 7210 - Reporta sobrecalentamiento de motor.",
    severidad: "alerta",
    hace: "Hace 28 min",
    rutasAlternas: ["Troncal Caracas", "Av. Suba"],
    instruccionesSugeridas: [
      "Detener la unidad en el próximo paradero seguro",
      "Apagar el motor y esperar asistencia técnica",
      "Trasladar pasajeros al siguiente bus disponible",
    ],
  },
  {
    id: "3",
    titulo: "Retraso en ruta",
    descripcion: "Ruta B12 - Retraso de 15 min por bloqueo en la Calle 26.",
    severidad: "alerta",
    hace: "Hace 1 h",
    rutasAlternas: ["Calle 80", "Troncal NQS"],
    instruccionesSugeridas: [
      "Tomar ruta alterna por la Calle 80",
      "Informar el retraso estimado a los pasajeros",
      "Coordinar con el siguiente turno el ajuste de horario",
    ],
  },
  {
    id: "4",
    titulo: "Mantenimiento programado",
    descripcion: "Bus 5087 - Ingreso a patio para revisión preventiva.",
    severidad: "info",
    hace: "Hace 2 h",
    rutasAlternas: [],
    instruccionesSugeridas: ["Confirmar relevo de unidad antes del ingreso a patio"],
  },
  {
    id: "5",
    titulo: "Inspección pendiente",
    descripcion: "Bus 7632 - No se ha registrado inspección del turno actual.",
    severidad: "alerta",
    hace: "Hace 3 h",
    rutasAlternas: [],
    instruccionesSugeridas: [
      "Realizar inspección de turno antes de salir a ruta",
      "Reportar novedades al supervisor de patio",
    ],
  },
];
