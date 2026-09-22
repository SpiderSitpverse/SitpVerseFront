export type RepairStatus = "pendiente" | "aceptada" | "completada";

export interface RepairRequest {
  id: string;
  busId: string;
  placa: string;
  troncal: string;
  ubicacion: string;
  problema: string;
  estado: RepairStatus;
  mecanicoId?: string;
  mecanicoNombre?: string;
  aceptadaEn?: string;
}

export interface RepairExpense {
  concepto: string;
  valor: number;
}

export interface RepairReport {
  requestId: string;
  busId: string;
  danosEncontrados: string;
  piezasReemplazadas: string;
  gastos: RepairExpense[];
  fotosBus: string[];
  fotosPiezas: string[];
  mecanicoId: string;
  mecanicoNombre: string;
  /** Updated on every save, draft or final. */
  actualizadoEn: string;
  /** Only set once "Finalizar servicio" is pressed. */
  completadaEn?: string;
}
