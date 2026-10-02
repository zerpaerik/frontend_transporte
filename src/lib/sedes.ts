// Identidad visual de cada empresa (sede): logo y color para documentos impresos.
export const MARCA_SEDE: Record<string, { logo: string; color: string }> = {
  mgr: { logo: "/sedes/mgr.jpg", color: "#8b0a14" },
  mjg: { logo: "/sedes/mjg.jpg", color: "#1f6fb2" },
  mgrsi: { logo: "/sedes/mgr.jpg", color: "#8b0a14" },
};

export const LOGO: Record<string, string> = Object.fromEntries(Object.entries(MARCA_SEDE).map(([k, v]) => [k, v.logo]));

export function marcaSede(codigo?: string): { logo: string; color: string } {
  return (codigo && MARCA_SEDE[codigo]) || { logo: "", color: "#334155" };
}
