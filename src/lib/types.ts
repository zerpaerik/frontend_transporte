// Tipos de dominio del sistema de gestión de transporte de carga pesada.

export type Rol = "Administrador" | "Operador" | "Mecánico" | "Conductor" | "Contable";

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
  constanciaTuc?: string;
  foto?: string | null;
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
  dni?: string;
  categoria: string;
  telefono: string;
  descuentoMensual?: number;
  documentos: DocumentoConductor[];
  foto?: string | null;
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
  kilometraje?: number;
  costo: number;
  estado: "Abierta" | "En proceso" | "Cerrada";
}

export type CalidadRepuesto = "Original" | "Alternativo" | "Remanufacturado";

export interface Repuesto {
  id: string;
  nombre: string;
  categoria: string;
  placa?: string;
  kilometraje?: number;
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
  createdAt?: string;
}

export type EstadoViaje = "Programado" | "En curso" | "Culminado" | "Devuelto" | "Cancelado";

export interface Viaje {
  id: string;
  placaTracto: string;
  carreta: string;
  conductor: string;
  cliente: string;
  clienteFactura?: string;
  operacion: "IMPO" | "EXPO";
  contenedor: string;
  tamanio: string;
  tipoCarga: string;
  horaCita: string;
  fechaCliente?: string; // ISO date
  horaCliente?: string;
  origen: string;
  destino: string;
  devolucion: string;
  ubicacion?: string;
  fechaViaje?: string; // fecha del viaje (manual)
  memo?: string; // vencimiento del MEMO
  observacion?: string;
  fechaLimite: string; // ISO date
  estado: EstadoViaje;
  nOrden: string;
  greRemitente: string;
  greTransporte: string;
  factura: string;
  tarifa?: number;
  clienteRuc?: string;
  clienteDireccion?: string;
}

export type EstadoFactura = "Emitida" | "Aceptada" | "Pagada" | "Anulada";

export interface FacturaItem {
  id?: string;
  descripcion: string;
  cantidad?: number;
  valorUnitario: number;
  afectacion?: string;
  unidad?: string;
}
export interface Factura {
  id: string;
  serie: string;
  tipo: "Factura" | "Boleta" | "N. Crédito" | "N. Débito";
  cliente: string;
  ruc: string;
  direccion?: string;
  fecha: string;
  viaje: string;
  monto: number;
  igv: number;
  estadoSunat: EstadoFactura;
  // Facturación electrónica (opcionales — llegan del backend)
  tipoDocCodigo?: string;
  correlativo?: string;
  moneda?: string;
  tipoCambio?: number;
  gravado?: number;
  total?: number;
  sujetoDetraccion?: boolean;
  montoDetraccion?: number;
  ctaDetraccion?: string;
  valorReferencial?: number;
  // Insumos del valor referencial (tablas DS 022-2025-MTC)
  vrAmbito?: string;
  vrRuta?: string;
  vrDestino?: string;
  vrPuerto?: string;
  vrZona?: string;
  vrTipoCarga?: string;
  pesoTM?: number;
  referenciaVR?: string;
  guia?: string;
  guiaTransportista?: string;
  ubigeoOrigen?: string;
  ubigeoDestino?: string;
  detalleViaje?: string;
  formaPago?: string;
  fechaVencimiento?: string | null;
  estadoDocumento?: string; // 101..108
  sunatDescripcion?: string;
  hash?: string;
  qr?: string;
  // Referencia (notas de crédito / débito)
  docRefTipo?: string;
  docRefSerie?: string;
  docRefCorrelativo?: string;
  codTipNc?: string;
  motivo?: string;
  items?: FacturaItem[];
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

export interface Combustible {
  id: string;
  fecha: string;
  placa: string;
  tipoCombustible: string; // Diésel | Gasolina | GNV | GLP
  kilometraje: number; // odómetro al cargar
  galones: number;
  monto: number; // soles
  tipoPago: string;
  observacion?: string;
}
