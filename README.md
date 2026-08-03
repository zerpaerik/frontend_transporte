# Sistema de Gestión de Transporte de Carga Pesada — Frontend

Frontend (solo interfaz) del sistema de gestión de transporte, construido con **Next.js + TypeScript + Tailwind CSS**. En esta etapa la data es de ejemplo (mock) y la autenticación es simulada en el navegador; más adelante se conecta al backend (NestJS).

## Módulos incluidos

1. **Flota** — vehículos (tractos y carretas)
2. **Conductores** — con documentos y alertas de vencimiento
3. **Mantenimiento** — órdenes de trabajo (preventivo / correctivo / predictivo)
4. **Repuestos** — con calidad y garantía
5. **Neumáticos** — por posición exacta
6. **Operaciones** — despachos de contenedores impo/expo + GRE + semáforo de devolución
7. **Facturación SUNAT** — comprobantes con estado (emitida / aceptada / pagada / anulada)
8. **Usuarios y roles**
9. **Planilla** — sueldos de choferes y administrativos
10. **Dashboard** — KPIs y alertas consolidadas

## Usuarios de prueba

| Correo | Contraseña | Rol |
| --- | --- | --- |
| admin@transporte.pe | admin123 | Administrador (Jose Luis Meza) |
| gerente@transporte.pe | gerente123 | Administrador (Erik Zerpa) |
| operador@transporte.pe | operador123 | Operador |
| mecanico@transporte.pe | mecanico123 | Mecánico |

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000

## Despliegue en Railway

1. Subir este repo a GitHub (ya conectado: `zerpaerik/frontend_transporte`).
2. En Railway: **New Project → Deploy from GitHub repo** y elegir este repositorio.
3. Railway detecta Next.js automáticamente. Build: `npm run build` · Start: `npm start`.
4. El puerto se toma de la variable `PORT` (ya está contemplado en el script `start`).
5. Al terminar, Railway entrega una URL pública para ir revisando el avance.

> Nota: esta versión es una base visual con datos de ejemplo. La persistencia real,
> la integración con SUNAT (OSE/PSE) y las notificaciones se implementan con el backend.
