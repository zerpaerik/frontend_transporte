// Tipos de dominio del sistema de gestión de transporte de carga pesada.

export type Rol = "Administrador" | "Operador" | "Mecánico";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo: boolean;
}

export interface Vehiculo {
  id: string;
  placa: string;
  tipo: "Tracto" | "Carreta";
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  estado: "Operativo" | "En taller" | "Inactivo";
}

export type EstadoDocumento = "Vigente" | "Por vencer" | "Vencido";

export interface DocumentoConductor {
  tipo: string;
  numero: string;
  vencimiento: string; // ISO date
}

export interface Conductor {
  id: string;
  nombre: string;
  licencia: string;
  categoria: string;
  telefono: string;
  descuentoMensual?: number;
  documentos: DocumentoConductor[];
}

export type TipoMantenimiento = "Preventivo" | "Correctivo" | "Predictivo";

export interface OrdenTrabajo {
  id: string;
  fecha: string;
  placa: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  responsable: string;
  conductor: string;
  costo: number;
  estado: "Abierta" | "En proceso" | "Cerrada";
}

export type CalidadRepuesto = "Original" | "Alternativo" | "Remanufacturado";

export interface Repuesto {
  id: string;
  nombre: string;
  categoria: string;
  calidad: CalidadRepuesto;
  cantidad: number;
  garantia: string;
  proveedor: string;
  costo: number;
  fecha: string;
}

export interface Neumatico {
  id: string;
  placa: string;
  posicion: string;
  marca: string;
  kmInstalacion: number;
  kmActual: number;
  costo: number;
  tienda: string;
  estado: "Nuevo" | "En uso" | "Para rotar" | "Reencauche" | "Descartado";
}

export type EstadoViaje = "Programado" | "En curso" | "Culminado" | "Devuelto";

export interface Viaje {
  id: string;
  placaTracto: string;
  carreta: string;
  conductor: string;
  cliente: string;
  operacion: "IMPO" | "EXPO";
  contenedor: string;
  tamanio: string;
  tipoCarga: string;
  horaCita: string;
  origen: string;
  destino: string;
  devolucion: string;
  fechaLimite: string; // ISO date
  estado: EstadoViaje;
  nOrden: string;
  greRemitente: string;
  greTransporte: string;
  factura: string;
}

export type EstadoFactura = "Emitida" | "Aceptada" | "Pagada" | "Anulada";

export interface Factura {
  id: string;
  serie: string;
  tipo: "Factura" | "Boleta" | "N. Crédito";
  cliente: string;
  ruc: string;
  direccion?: string;
  fecha: string;
  viaje: string;
  monto: number;
  igv: number;
  estadoSunat: EstadoFactura;
}

export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  tipo: "Chofer" | "Administrativo";
  sueldoBase: number;
  bonos: number;
  descuentos: number;
  periodo: string;
  estadoPago: "Pendiente" | "Pagado";
}
