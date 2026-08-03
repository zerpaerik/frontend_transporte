import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Sistema de Transporte de Carga Pesada",
  description: "Gestión de flota, conductores, mantenimiento, operaciones, facturación SUNAT y planilla.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <DataProvider>{children}</DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
