import type {
  Usuario, Vehiculo, Conductor, OrdenTrabajo, Repuesto,
  Neumatico, Viaje, Factura, Empleado, TipoMantenimiento, CalidadRepuesto,
} from "./types";

// ---------------------------------------------------------------------------
// Utilidades determinísticas (sin Date.now / Math.random) para datos estables.
// ---------------------------------------------------------------------------
const BASE = Date.parse("2026-08-03T12:00:00");
const iso = (offsetDays: number) =>
  new Date(BASE + offsetDays * 86_400_000).toISOString().slice(0, 10);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const int = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pad = (n: number, w = 5) => String(n).padStart(w, "0");

// ---------------------------------------------------------------------------
// Usuarios de prueba (autenticación mock, solo frontend).
// ---------------------------------------------------------------------------
export const USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Jose Luis Meza", email: "admin@transporte.pe", password: "admin123", rol: "Administrador", activo: true },
  { id: "u2", nombre: "Erik Zerpa", email: "gerente@transporte.pe", password: "gerente123", rol: "Administrador", activo: true },
  { id: "u3", nombre: "Rosa Quispe", email: "operador@transporte.pe", password: "operador123", rol: "Operador", activo: true },
  { id: "u4", nombre: "Luis Ramírez", email: "mecanico@transporte.pe", password: "mecanico123", rol: "Mecánico", activo: true },
];

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------
const MARCAS_TRACTO = ["Volvo", "Scania", "Freightliner", "International", "Kenworth", "Mack", "Mercedes-Benz"];
const MODELOS: Record<string, string[]> = {
  Volvo: ["FH 460", "FH 500", "FMX 440"], Scania: ["R450", "R500", "G410"],
  Freightliner: ["Cascadia", "Columbia"], International: ["ProStar", "LoneStar"],
  Kenworth: ["T680", "T800"], Mack: ["Anthem", "Pinnacle"], "Mercedes-Benz": ["Actros 2645", "Axor 2544"],
};
const NOMBRES = [
  "Julio Grimaldo", "Jose Palomino", "Ronald Saavedra", "Rafael Cristino", "Jimy Obregón",
  "Marco Antúnez", "Pedro Ccahua", "Elmer Ríos", "David Ramos", "Walter Ñahui",
  "Segundo Vásquez", "Nilton Pariona", "César Huamán", "Óscar Ledesma", "Aldo Ventura",
  "Fredy Chávez", "Manuel Torres", "Iván Quiroz", "Hugo Malca", "Teddy Bardales",
];
const CLIENTES = ["ULOG", "LESCHACO", "INTERLOG", "DPA", "RANSA", "NEPTUNIA", "TRAMARSA", "CONTRANS", "AUSA", "IMUPESA"];
const PUERTOS = ["DPWC", "APM", "TP Callao"];
const DESTINOS = ["Cercado de Lima", "Lurín", "Pta. Hermosa", "Villa El Salvador", "Ate", "Callao", "Chilca", "Huachipa"];
const DEVOL = ["MEDLOG", "DPW GT1", "CONSTRANS", "NEPTUNIA", "IMUPESA", "RANSA"];
const TIENDAS = ["Neumáticos Perú", "Lima Llantas", "Repuestos DP", "Autopartes Lima", "Casa del Camión"];
const MARCAS_LLANTA = ["Michelin", "Bridgestone", "Goodyear", "Pirelli", "Continental", "Hankook"];
const POSICIONES = [
  "Delantero izq. (P1)", "Delantero der. (P1)", "Tracción int. izq. (P2)", "Tracción int. der. (P2)",
  "Tracción ext. izq. (P3)", "Tracción ext. der. (P3)",
];
const CATEGORIAS = ["A-IIIC", "A-IIIB", "A-IIIA"];
const DOC_TIPOS = ["Licencia de conducir", "Certificado MTC", "Examen médico", "SCTR", "Récord de conductor"];
const REP_NOMBRES = [
  "Pastillas de freno", "Filtro de aceite", "Filtro de aire", "Kit de embrague", "Batería 12V 200Ah",
  "Amortiguador delantero", "Bomba de agua", "Alternador", "Faro delantero", "Retén de rueda",
  "Turbo compresor", "Radiador", "Correa de distribución", "Sensor ABS", "Muelle trasero",
];
const REP_CATS = ["Frenos", "Filtros", "Transmisión", "Eléctrico", "Motor", "Suspensión", "Refrigeración"];
const CALIDADES: CalidadRepuesto[] = ["Original", "Alternativo", "Remanufacturado"];
const TIPOS_MANT: TipoMantenimiento[] = ["Preventivo", "Correctivo", "Predictivo"];
const MANT_DESC = [
  "Mantenimiento programado: aceite, filtros y revisión general",
  "Cambio de pastillas y discos de freno por desgaste",
  "Reparación de sistema de embrague",
  "Análisis de vibración y ajuste de eje trasero",
  "Cambio de amortiguadores y revisión de suspensión",
  "Diagnóstico eléctrico y cambio de alternador",
  "Reemplazo de batería y limpieza de bornes",
  "Revisión de sistema de refrigeración y radiador",
];
const CARGOS_ADM = ["Coordinadora de operaciones", "Asistente administrativo", "Contador", "Jefe de flota", "Recepcionista", "Tesorería"];

// ---------------------------------------------------------------------------
// Semillas curadas (aparecen primero, reflejan el Excel real del cliente)
// ---------------------------------------------------------------------------
const vehiculosSeed: Vehiculo[] = [
  { id: "v1", placa: "AAT-843", tipo: "Tracto", marca: "Volvo", modelo: "FH 460", anio: 2019, kilometraje: 412300, estado: "Operativo" },
  { id: "v2", placa: "AAT-945", tipo: "Tracto", marca: "Scania", modelo: "R450", anio: 2021, kilometraje: 238100, estado: "Operativo" },
  { id: "v3", placa: "AHM-708", tipo: "Tracto", marca: "Freightliner", modelo: "Cascadia", anio: 2018, kilometraje: 528900, estado: "En taller" },
  { id: "v4", placa: "BHC-935", tipo: "Tracto", marca: "International", modelo: "ProStar", anio: 2020, kilometraje: 301450, estado: "Operativo" },
  { id: "v5", placa: "F9A-860", tipo: "Tracto", marca: "Volvo", modelo: "FH 500", anio: 2022, kilometraje: 156700, estado: "Operativo" },
  { id: "c1", placa: "A6V-985", tipo: "Carreta", marca: "Fameca", modelo: "Portacontenedor", anio: 2018, kilometraje: 0, estado: "Operativo" },
  { id: "c2", placa: "BSB-973", tipo: "Carreta", marca: "Randon", modelo: "Plataforma 40'", anio: 2020, kilometraje: 0, estado: "Operativo" },
  { id: "c3", placa: "C2A-993", tipo: "Carreta", marca: "Fameca", modelo: "Portacontenedor", anio: 2019, kilometraje: 0, estado: "Inactivo" },
];

const conductoresSeed: Conductor[] = [
  { id: "d1", nombre: "Julio Grimaldo", licencia: "Q40128761", categoria: "A-IIIC", telefono: "987 654 321",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q40128761", vencimiento: iso(9) },
      { tipo: "Certificado MTC", numero: "MTC-88213", vencimiento: iso(201) },
      { tipo: "Examen médico", numero: "EM-2025-441", vencimiento: iso(25) },
    ] },
  { id: "d2", nombre: "Jose Palomino", licencia: "Q39887120", categoria: "A-IIIC", telefono: "986 112 233",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q39887120", vencimiento: iso(94) },
      { tipo: "SCTR", numero: "SCTR-77120", vencimiento: iso(15) },
    ] },
  { id: "d3", nombre: "Ronald Saavedra", licencia: "Q41220198", categoria: "A-IIIB", telefono: "999 445 780",
    documentos: [
      { tipo: "Licencia de conducir", numero: "Q41220198", vencimiento: iso(-4) },
      { tipo: "Certificado MTC", numero: "MTC-90441", vencimiento: iso(43) },
    ] },
];

const ordenesSeed: OrdenTrabajo[] = [
  { id: "ot1", fecha: iso(-6), placa: "AHM-708", tipo: "Correctivo", descripcion: "Falla en sistema de frenos, cambio de pastillas y discos", responsable: "Taller Diesel Pro", conductor: "Ronald Saavedra", costo: 2450, estado: "En proceso" },
  { id: "ot2", fecha: iso(-14), placa: "AAT-843", tipo: "Preventivo", descripcion: "Mantenimiento programado 400k km: aceite, filtros, revisión general", responsable: "Luis Ramírez", conductor: "Julio Grimaldo", costo: 1180, estado: "Cerrada" },
  { id: "ot3", fecha: iso(-2), placa: "BHC-935", tipo: "Predictivo", descripcion: "Análisis de vibración en eje trasero, ajuste preventivo", responsable: "Luis Ramírez", conductor: "Rafael Cristino", costo: 620, estado: "Abierta" },
];

const repuestosSeed: Repuesto[] = [
  { id: "r1", nombre: "Pastillas de freno delanteras", categoria: "Frenos", calidad: "Original", cantidad: 4, garantia: "12 meses", proveedor: "Repuestos DP", costo: 480, fecha: iso(-6) },
  { id: "r2", nombre: "Filtro de aceite", categoria: "Filtros", calidad: "Alternativo", cantidad: 2, garantia: "6 meses", proveedor: "Autopartes Lima", costo: 90, fecha: iso(-14) },
  { id: "r3", nombre: "Kit de embrague", categoria: "Transmisión", calidad: "Original", cantidad: 1, garantia: "24 meses", proveedor: "Scania Perú", costo: 2600, fecha: iso(-19) },
];

const neumaticosSeed: Neumatico[] = [
  { id: "n1", placa: "AAT-843", posicion: "Delantero izq. (P1)", marca: "Michelin", kmInstalacion: 380000, kmActual: 412300, costo: 1350, tienda: "Neumáticos Perú", estado: "En uso" },
  { id: "n2", placa: "AAT-843", posicion: "Delantero der. (P1)", marca: "Michelin", kmInstalacion: 380000, kmActual: 412300, costo: 1350, tienda: "Neumáticos Perú", estado: "En uso" },
  { id: "n3", placa: "AAT-843", posicion: "Tracción int. izq. (P2)", marca: "Bridgestone", kmInstalacion: 300000, kmActual: 412300, costo: 1280, tienda: "Lima Llantas", estado: "Para rotar" },
];

const viajesSeed: Viaje[] = [
  { id: "t1", placaTracto: "AAT-945", carreta: "BSB-973", conductor: "Jose Palomino", cliente: "ULOG", operacion: "IMPO", contenedor: "PCIU6111486", tamanio: "40'", tipoCarga: "GRAL", horaCita: "08:00", origen: "DPWC", destino: "Cercado de Lima", devolucion: "DPW GT1", fechaLimite: iso(3), estado: "Culminado", nOrden: "26/03000251", greRemitente: "T001-26916", greTransporte: "V001-01028", factura: "F001-01037" },
  { id: "t2", placaTracto: "BHC-935", carreta: "C2A-993", conductor: "Ronald Saavedra", cliente: "LESCHACO", operacion: "IMPO", contenedor: "HPCU2635520", tamanio: "20'", tipoCarga: "GRAL", horaCita: "08:00", origen: "APM", destino: "Antonio - HT Perú", devolucion: "MEDLOG", fechaLimite: iso(1), estado: "En curso", nOrden: "26/03000258", greRemitente: "T001-26940", greTransporte: "V001-01044", factura: "" },
  { id: "t3", placaTracto: "F9A-860", carreta: "A6V-985", conductor: "Jimy Obregón", cliente: "DPA", operacion: "IMPO", contenedor: "ONEU6879336", tamanio: "40'", tipoCarga: "GRAL", horaCita: "05:00", origen: "DPWC", destino: "Pta. Hermosa", devolucion: "CONSTRANS", fechaLimite: iso(0), estado: "En curso", nOrden: "26/03000260", greRemitente: "T001-26955", greTransporte: "V001-01051", factura: "" },
];

const facturasSeed: Factura[] = [
  { id: "f1", serie: "F001-01037", tipo: "Factura", cliente: "ULOG", ruc: "20512345671", fecha: iso(-4), viaje: "PCIU6111486", monto: 1100, igv: 198, estadoSunat: "Pagada" },
  { id: "f2", serie: "F001-01035", tipo: "Factura", cliente: "INTERLOG", ruc: "20487654321", fecha: iso(-6), viaje: "BMOU6799262", monto: 1650, igv: 297, estadoSunat: "Aceptada" },
  { id: "f3", serie: "F001-01038", tipo: "Factura", cliente: "LESCHACO", ruc: "20601122334", fecha: iso(-2), viaje: "HPCU2635520", monto: 980, igv: 176.4, estadoSunat: "Emitida" },
];

const empleadosSeed: Empleado[] = [
  { id: "e1", nombre: "Julio Grimaldo", cargo: "Chofer A-IIIC", tipo: "Chofer", sueldoBase: 2800, bonos: 450, descuentos: 320, periodo: "Julio 2026", estadoPago: "Pagado" },
  { id: "e2", nombre: "Rosa Quispe", cargo: "Coordinadora de operaciones", tipo: "Administrativo", sueldoBase: 3200, bonos: 500, descuentos: 360, periodo: "Julio 2026", estadoPago: "Pendiente" },
];

// ---------------------------------------------------------------------------
// Generadores (agregan volumen para paginación / filtros)
// ---------------------------------------------------------------------------
function genPlaca(r: () => number) {
  const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
  return `${pick(r, L.split(""))}${pick(r, L.split(""))}${pick(r, L.split(""))}-${int(r, 100, 999)}`;
}

function genVehiculos(n: number): Vehiculo[] {
  const r = rng(101);
  const estados: Vehiculo["estado"][] = ["Operativo", "Operativo", "Operativo", "En taller", "Inactivo"];
  return Array.from({ length: n }, (_, i) => {
    const tracto = r() > 0.35;
    const marca = pick(r, MARCAS_TRACTO);
    return {
      id: `vg${i}`, placa: genPlaca(r), tipo: tracto ? "Tracto" : "Carreta",
      marca: tracto ? marca : pick(r, ["Fameca", "Randon", "Montenegro"]),
      modelo: tracto ? pick(r, MODELOS[marca]) : pick(r, ["Portacontenedor", "Plataforma 40'", "Cama baja"]),
      anio: int(r, 2015, 2024), kilometraje: tracto ? int(r, 90, 620) * 1000 : 0,
      estado: pick(r, estados),
    };
  });
}

function genConductores(n: number): Conductor[] {
  const r = rng(202);
  const offsets = [-8, -3, 6, 12, 18, 27, 40, 75, 120, 190, 260];
  return Array.from({ length: n }, (_, i) => {
    const nombre = NOMBRES[(i + 5) % NOMBRES.length];
    const lic = "Q" + int(r, 39000000, 43000000);
    const nDocs = int(r, 2, 3);
    return {
      id: `dg${i}`, nombre, licencia: lic, categoria: pick(r, CATEGORIAS), telefono: `9${int(r, 10, 99)} ${int(r, 100, 999)} ${int(r, 100, 999)}`,
      documentos: Array.from({ length: nDocs }, (_, k) => ({
        tipo: k === 0 ? "Licencia de conducir" : pick(r, DOC_TIPOS),
        numero: k === 0 ? lic : `DOC-${int(r, 10000, 99999)}`,
        vencimiento: iso(pick(r, offsets)),
      })),
    };
  });
}

function genOrdenes(n: number): OrdenTrabajo[] {
  const r = rng(303);
  const placas = vehiculosSeed.filter((v) => v.tipo === "Tracto").map((v) => v.placa).concat(["JKL-210", "MNP-455", "RST-772"]);
  const resp = ["Luis Ramírez", "Taller Diesel Pro", "Taller Scania Lima", "Taller Volvo Perú", "Mecánica Central"];
  const estados: OrdenTrabajo["estado"][] = ["Abierta", "En proceso", "Cerrada", "Cerrada"];
  return Array.from({ length: n }, (_, i) => ({
    id: `og${i}`, fecha: iso(-int(r, 1, 120)), placa: pick(r, placas), tipo: pick(r, TIPOS_MANT),
    descripcion: pick(r, MANT_DESC), responsable: pick(r, resp), conductor: pick(r, NOMBRES),
    costo: int(r, 15, 480) * 10, estado: pick(r, estados),
  }));
}

function genRepuestos(n: number): Repuesto[] {
  const r = rng(404);
  return Array.from({ length: n }, (_, i) => ({
    id: `rg${i}`, nombre: pick(r, REP_NOMBRES), categoria: pick(r, REP_CATS), calidad: pick(r, CALIDADES),
    cantidad: int(r, 1, 8), garantia: pick(r, ["6 meses", "12 meses", "24 meses", "20 000 km", "40 000 km"]),
    proveedor: pick(r, TIENDAS), costo: int(r, 5, 300) * 10, fecha: iso(-int(r, 1, 150)),
  }));
}

function genNeumaticos(n: number): Neumatico[] {
  const r = rng(505);
  const placas = vehiculosSeed.filter((v) => v.tipo === "Tracto").map((v) => v.placa).concat(["JKL-210", "MNP-455", "RST-772", "UVW-118"]);
  const estados: Neumatico["estado"][] = ["Nuevo", "En uso", "En uso", "En uso", "Para rotar", "Reencauche", "Descartado"];
  return Array.from({ length: n }, (_, i) => {
    const kmI = int(r, 100, 400) * 1000;
    return {
      id: `ng${i}`, placa: pick(r, placas), posicion: pick(r, POSICIONES), marca: pick(r, MARCAS_LLANTA),
      kmInstalacion: kmI, kmActual: kmI + int(r, 5, 120) * 1000, costo: int(r, 110, 145) * 10,
      tienda: pick(r, TIENDAS), estado: pick(r, estados),
    };
  });
}

function genViajes(n: number): Viaje[] {
  const r = rng(606);
  const tractos = vehiculosSeed.filter((v) => v.tipo === "Tracto").map((v) => v.placa).concat(["JKL-210", "MNP-455"]);
  const carretas = vehiculosSeed.filter((v) => v.tipo === "Carreta").map((v) => v.placa).concat(["XY1-902"]);
  const estados: Viaje["estado"][] = ["Programado", "En curso", "En curso", "Culminado", "Culminado", "Devuelto"];
  const contPfx = ["PCIU", "HPCU", "ONEU", "BMOU", "MSKU", "TCLU", "CAIU", "GESU"];
  const offsets = [-6, -3, -1, 0, 1, 2, 3, 5, 8, 12, 20];
  return Array.from({ length: n }, (_, i) => {
    const estado = pick(r, estados);
    const cerrado = estado === "Culminado" || estado === "Devuelto";
    const cont = `${pick(r, contPfx)}${int(r, 1000000, 9999999)}`;
    return {
      id: `tg${i}`, placaTracto: pick(r, tractos), carreta: pick(r, carretas), conductor: pick(r, NOMBRES),
      cliente: pick(r, CLIENTES), operacion: r() > 0.5 ? "IMPO" : "EXPO", contenedor: cont,
      tamanio: pick(r, ["20'", "40'", "40' HC"]), tipoCarga: pick(r, ["GRAL", "IMO", "REEFER", "GRAL"]),
      horaCita: `${pad(int(r, 5, 18), 2)}:00`, origen: pick(r, PUERTOS), destino: pick(r, DESTINOS), devolucion: pick(r, DEVOL),
      fechaLimite: iso(pick(r, offsets)), estado,
      nOrden: `26/030${pad(int(r, 100, 900), 5)}`,
      greRemitente: cerrado || r() > 0.4 ? `T001-${int(r, 26000, 27999)}` : "",
      greTransporte: cerrado || r() > 0.5 ? `V001-${pad(int(r, 1000, 1999))}` : "",
      factura: cerrado && r() > 0.3 ? `F001-${pad(int(r, 1000, 1999))}` : "",
    };
  });
}

function genFacturas(n: number): Factura[] {
  const r = rng(707);
  const tipos: Factura["tipo"][] = ["Factura", "Factura", "Factura", "Boleta", "N. Crédito"];
  const estados: Factura["estadoSunat"][] = ["Emitida", "Aceptada", "Aceptada", "Pagada", "Pagada", "Anulada"];
  return Array.from({ length: n }, (_, i) => {
    const monto = int(r, 40, 320) * 10;
    const tipo = pick(r, tipos);
    return {
      id: `fg${i}`, serie: `${tipo === "Boleta" ? "B" : "F"}001-${pad(int(r, 1000, 1999))}`, tipo,
      cliente: tipo === "Boleta" ? "Cliente varios" : pick(r, CLIENTES),
      ruc: tipo === "Boleta" ? "-" : `20${int(r, 400000000, 620000000)}`,
      fecha: iso(-int(r, 1, 120)), viaje: `${pick(r, ["PCIU", "HPCU", "ONEU", "BMOU"])}${int(r, 1000000, 9999999)}`,
      monto, igv: Math.round(monto * 0.18 * 100) / 100, estadoSunat: pick(r, estados),
    };
  });
}

function genEmpleados(n: number): Empleado[] {
  const r = rng(808);
  return Array.from({ length: n }, (_, i) => {
    const chofer = r() > 0.4;
    return {
      id: `eg${i}`, nombre: NOMBRES[(i + 2) % NOMBRES.length],
      cargo: chofer ? `Chofer ${pick(r, CATEGORIAS)}` : pick(r, CARGOS_ADM),
      tipo: chofer ? "Chofer" : "Administrativo",
      sueldoBase: chofer ? int(r, 240, 320) * 10 : int(r, 180, 400) * 10,
      bonos: int(r, 10, 60) * 10, descuentos: int(r, 15, 45) * 10,
      periodo: "Julio 2026", estadoPago: r() > 0.45 ? "Pagado" : "Pendiente",
    };
  });
}

// ---------------------------------------------------------------------------
// Exports finales (semillas curadas + generadas)
// ---------------------------------------------------------------------------
export const VEHICULOS: Vehiculo[] = [...vehiculosSeed, ...genVehiculos(18)];
export const CONDUCTORES: Conductor[] = [...conductoresSeed, ...genConductores(12)];
export const ORDENES: OrdenTrabajo[] = [...ordenesSeed, ...genOrdenes(38)];
export const REPUESTOS: Repuesto[] = [...repuestosSeed, ...genRepuestos(34)];
export const NEUMATICOS: Neumatico[] = [...neumaticosSeed, ...genNeumaticos(46)];
export const VIAJES: Viaje[] = [...viajesSeed, ...genViajes(42)];
export const FACTURAS: Factura[] = [...facturasSeed, ...genFacturas(38)];
export const EMPLEADOS: Empleado[] = [...empleadosSeed, ...genEmpleados(18)];
