import type {
  Usuario, Vehiculo, Conductor, OrdenTrabajo, Repuesto,
  Neumatico, Viaje, Factura, Empleado,
} from "./types";

// Usuarios de prueba (autenticación mock, solo frontend).
export const USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Jose Luis Meza", email: "admin@transporte.pe", password: "admin123", rol: "Administrador", activo: true },
  { id: "u2", nombre: "Erik Zerpa", email: "gerente@transporte.pe", password: "gerente123", rol: "Administrador", activo: true },
  { id: "u3", nombre: "Rosa Quispe", email: "operador@transporte.pe", password: "operador123", rol: "Operador", activo: true },
  { id: "u4", nombre: "Luis Ramírez", email: "mecanico@transporte.pe", password: "mecanico123", rol: "Mecánico", activo: true },
];

export const VEHICULOS: Vehiculo[] = [
  { id: "v1", placa: "AAT-843", tipo: "Tracto", marca: "Volvo", modelo: "FH 460", anio: 2019, kilometraje: 412300, estado: "Operativo" },
  { id: "v2", placa: "AAT-945", tipo: "Tracto", marca: "Scania", modelo: "R450", anio: 2021, kilometraje: 238100, estado: "Operativo" },
  { id: "v3", placa: "AHM-708", tipo: "Tracto", marca: "Freightliner", modelo: "Cascadia", anio: 2018, kilometraje: 528900, estado: "En taller" },
  { id: "v4", placa: "BHC-935", tipo: "Tracto", marca: "International", modelo: "ProStar", anio: 2020, kilometraje: 301450, estado: "Operativo" },
  { id: "v5", placa: "F9A-860", tipo: "Tracto", marca: "Volvo", modelo: "FH 500", anio: 2022, kilometraje: 156700, estado: "Operativo" },
  { id: "c1", placa: "A6V-985", tipo: "Carreta", marca: "Fameca", modelo: "Portacontenedor", anio: 2018, kilometraje: 0, estado: "Operativo" },
  { id: "c2", placa: "BSB-973", tipo: "Carreta", marca: "Randon", modelo: "Plataforma 40'", anio: 2020, kilometraje: 0, estado: "Operativo" },
  { id: "c3", placa: "C2A-993", tipo: "Carreta", marca: "Fameca", modelo: "Portacontenedor", anio: 2019, kilometraje: 0, estado: "Inactivo" },
];

export const CONDUCTORES: Conductor[] = [
  {
    id: "d1", nombre: "Julio Grimaldo", licencia: "Q40128761", categoria: "A-IIIC", telefono: "987 654 321",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q40128761", vencimiento: "2026-08-12" },
      { tipo: "Certificado MTC", numero: "MTC-88213", vencimiento: "2027-02-20" },
      { tipo: "Examen médico", numero: "EM-2025-441", vencimiento: "2026-08-28" },
    ],
  },
  {
    id: "d2", nombre: "Jose Palomino", licencia: "Q39887120", categoria: "A-IIIC", telefono: "986 112 233",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q39887120", vencimiento: "2026-11-05" },
      { tipo: "SCTR", numero: "SCTR-77120", vencimiento: "2026-08-18" },
    ],
  },
  {
    id: "d3", nombre: "Ronald Saavedra", licencia: "Q41220198", categoria: "A-IIIB", telefono: "999 445 780",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q41220198", vencimiento: "2026-07-30" },
      { tipo: "Certificado MTC", numero: "MTC-90441", vencimiento: "2026-09-15" },
    ],
  },
  {
    id: "d4", nombre: "Rafael Cristino", licencia: "Q40551277", categoria: "A-IIIC", telefono: "955 320 118",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q40551277", vencimiento: "2027-03-01" },
      { tipo: "Examen médico", numero: "EM-2026-102", vencimiento: "2026-12-10" },
    ],
  },
  {
    id: "d5", nombre: "Jimy Obregón", licencia: "Q42010933", categoria: "A-IIIC", telefono: "941 887 654",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q42010933", vencimiento: "2026-08-25" },
      { tipo: "SCTR", numero: "SCTR-81002", vencimiento: "2027-01-05" },
    ],
  },
];

export const ORDENES: OrdenTrabajo[] = [
  { id: "ot1", fecha: "2026-07-28", placa: "AHM-708", tipo: "Correctivo", descripcion: "Falla en sistema de frenos, cambio de pastillas y discos", responsable: "Taller Diesel Pro", conductor: "Ronald Saavedra", costo: 2450, estado: "En proceso" },
  { id: "ot2", fecha: "2026-07-20", placa: "AAT-843", tipo: "Preventivo", descripcion: "Mantenimiento programado 400k km: aceite, filtros, revisión general", responsable: "Luis Ramírez", conductor: "Julio Grimaldo", costo: 1180, estado: "Cerrada" },
  { id: "ot3", fecha: "2026-08-01", placa: "BHC-935", tipo: "Predictivo", descripcion: "Análisis de vibración en eje trasero, ajuste preventivo", responsable: "Luis Ramírez", conductor: "Rafael Cristino", costo: 620, estado: "Abierta" },
  { id: "ot4", fecha: "2026-07-15", placa: "AAT-945", tipo: "Correctivo", descripcion: "Cambio de embrague completo", responsable: "Taller Scania Lima", conductor: "Jose Palomino", costo: 3900, estado: "Cerrada" },
];

export const REPUESTOS: Repuesto[] = [
  { id: "r1", nombre: "Pastillas de freno delanteras", categoria: "Frenos", calidad: "Original", cantidad: 4, garantia: "12 meses", proveedor: "Repuestos DP", costo: 480, fecha: "2026-07-28" },
  { id: "r2", nombre: "Filtro de aceite", categoria: "Filtros", calidad: "Alternativo", cantidad: 2, garantia: "6 meses", proveedor: "Autopartes Lima", costo: 90, fecha: "2026-07-20" },
  { id: "r3", nombre: "Kit de embrague", categoria: "Transmisión", calidad: "Original", cantidad: 1, garantia: "24 meses", proveedor: "Scania Perú", costo: 2600, fecha: "2026-07-15" },
  { id: "r4", nombre: "Batería 12V 200Ah", categoria: "Eléctrico", calidad: "Remanufacturado", cantidad: 2, garantia: "8 meses", proveedor: "Baterías Etna", costo: 720, fecha: "2026-06-30" },
];

export const NEUMATICOS: Neumatico[] = [
  { id: "n1", placa: "AAT-843", posicion: "Delantero izq. (P1)", marca: "Michelin", kmInstalacion: 380000, kmActual: 412300, costo: 1350, tienda: "Neumáticos Perú", estado: "En uso" },
  { id: "n2", placa: "AAT-843", posicion: "Delantero der. (P1)", marca: "Michelin", kmInstalacion: 380000, kmActual: 412300, costo: 1350, tienda: "Neumáticos Perú", estado: "En uso" },
  { id: "n3", placa: "AAT-843", posicion: "Tracción int. izq. (P2)", marca: "Bridgestone", kmInstalacion: 300000, kmActual: 412300, costo: 1280, tienda: "Lima Llantas", estado: "Para rotar" },
  { id: "n4", placa: "AAT-945", posicion: "Delantero izq. (P1)", marca: "Goodyear", kmInstalacion: 210000, kmActual: 238100, costo: 1290, tienda: "Neumáticos Perú", estado: "En uso" },
  { id: "n5", placa: "BHC-935", posicion: "Tracción ext. der. (P3)", marca: "Michelin", kmInstalacion: 250000, kmActual: 301450, costo: 1350, tienda: "Lima Llantas", estado: "Reencauche" },
];

export const VIAJES: Viaje[] = [
  { id: "t1", placaTracto: "AAT-945", carreta: "BSB-973", conductor: "Jose Palomino", cliente: "ULOG", operacion: "IMPO", contenedor: "PCIU6111486", tamanio: "40'", tipoCarga: "GRAL", horaCita: "08:00", origen: "DPWC", destino: "Cercado de Lima", devolucion: "DPW GT1", fechaLimite: "2026-08-06", estado: "Culminado", nOrden: "26/03000251", greRemitente: "T001-26916", greTransporte: "V001-01028", factura: "F001-01037" },
  { id: "t2", placaTracto: "BHC-935", carreta: "C2A-993", conductor: "Ronald Saavedra", cliente: "LESCHACO", operacion: "IMPO", contenedor: "HPCU2635520", tamanio: "20'", tipoCarga: "GRAL", horaCita: "08:00", origen: "APM", destino: "Antonio - HT Perú", devolucion: "MEDLOG", fechaLimite: "2026-08-04", estado: "En curso", nOrden: "26/03000258", greRemitente: "T001-26940", greTransporte: "V001-01044", factura: "" },
  { id: "t3", placaTracto: "F9A-860", carreta: "A6V-985", conductor: "Jimy Obregón", cliente: "DPA", operacion: "IMPO", contenedor: "ONEU6879336", tamanio: "40'", tipoCarga: "GRAL", horaCita: "05:00", origen: "DPWC", destino: "Pta. Hermosa", devolucion: "CONSTRANS", fechaLimite: "2026-08-03", estado: "En curso", nOrden: "26/03000260", greRemitente: "T001-26955", greTransporte: "V001-01051", factura: "" },
  { id: "t4", placaTracto: "AAT-843", carreta: "BSB-973", conductor: "Julio Grimaldo", cliente: "INTERLOG", operacion: "EXPO", contenedor: "BMOU6799262", tamanio: "40'", tipoCarga: "GRAL", horaCita: "08:00", origen: "APM", destino: "Lurín", devolucion: "MEDLOG", fechaLimite: "2026-08-09", estado: "Programado", nOrden: "26/03000264", greRemitente: "", greTransporte: "", factura: "" },
];

export const FACTURAS: Factura[] = [
  { id: "f1", serie: "F001-01037", tipo: "Factura", cliente: "ULOG", ruc: "20512345671", fecha: "2026-07-30", viaje: "PCIU6111486", monto: 1100, igv: 198, estadoSunat: "Pagada" },
  { id: "f2", serie: "F001-01035", tipo: "Factura", cliente: "INTERLOG", ruc: "20487654321", fecha: "2026-07-28", viaje: "BMOU6799262", monto: 1650, igv: 297, estadoSunat: "Aceptada" },
  { id: "f3", serie: "F001-01038", tipo: "Factura", cliente: "LESCHACO", ruc: "20601122334", fecha: "2026-08-01", viaje: "HPCU2635520", monto: 980, igv: 176.4, estadoSunat: "Emitida" },
  { id: "f4", serie: "B001-00212", tipo: "Boleta", cliente: "Cliente varios", ruc: "-", fecha: "2026-08-02", viaje: "-", monto: 450, igv: 81, estadoSunat: "Aceptada" },
  { id: "f5", serie: "F001-01030", tipo: "N. Crédito", cliente: "DPA", ruc: "20555667788", fecha: "2026-07-22", viaje: "ONEU6879336", monto: 300, igv: 54, estadoSunat: "Anulada" },
];

export const EMPLEADOS: Empleado[] = [
  { id: "e1", nombre: "Julio Grimaldo", cargo: "Chofer A-IIIC", tipo: "Chofer", sueldoBase: 2800, bonos: 450, descuentos: 320, periodo: "Julio 2026", estadoPago: "Pagado" },
  { id: "e2", nombre: "Jose Palomino", cargo: "Chofer A-IIIC", tipo: "Chofer", sueldoBase: 2800, bonos: 380, descuentos: 300, periodo: "Julio 2026", estadoPago: "Pagado" },
  { id: "e3", nombre: "Ronald Saavedra", cargo: "Chofer A-IIIB", tipo: "Chofer", sueldoBase: 2600, bonos: 300, descuentos: 280, periodo: "Julio 2026", estadoPago: "Pendiente" },
  { id: "e4", nombre: "Rosa Quispe", cargo: "Coordinadora de operaciones", tipo: "Administrativo", sueldoBase: 3200, bonos: 500, descuentos: 360, periodo: "Julio 2026", estadoPago: "Pendiente" },
  { id: "e5", nombre: "Carlos Fuentes", cargo: "Asistente administrativo", tipo: "Administrativo", sueldoBase: 1800, bonos: 200, descuentos: 190, periodo: "Julio 2026", estadoPago: "Pagado" },
];
