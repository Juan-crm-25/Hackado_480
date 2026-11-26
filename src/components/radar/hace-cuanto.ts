/** «hace 3 horas», «hace 1 día», «hace 12 días». */
export function haceCuanto(fecha: Date, ahora: Date): string {
  const horas = Math.floor((ahora.getTime() - fecha.getTime()) / 3600000);
  if (horas < 1) return "hace un momento";
  if (horas < 24) return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
