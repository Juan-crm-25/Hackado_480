/**
 * Prueba la IA del foro (H10) con ejemplos en español y la clave real (AI_FORO_API_KEY en .env.local).
 *
 *   npm run probar:foro
 *
 * No toca la BBDD. Sirve para comprobar que el modelo de decisión entiende el español antes de usarlo,
 * y para ajustar AI_FORO_UMBRAL. Cada ejemplo cuenta como una petición del plan gratuito.
 */
import { getConfigIAForo } from "../src/lib/ai/config-foro";
import { validarComentarioForo, type ResultadoValidacionForo } from "../src/lib/agentes/validador-foro";

const ESPECIFICIDAD = {
  titulo: "¿Qué gana, una clase o un id?",
  cuerpo: "Tengo un párrafo con class=\"aviso\" e id=\"principal\" y cada selector le pone un color distinto. ¿Cuál se aplica?",
};
const CAJA = {
  titulo: "¿Por qué mi caja mide más de 200px?",
  cuerpo: "Le pongo width: 200px, padding: 20px y un borde de 2px y en el navegador mide 244px. ¿Qué pasa?",
};

const CASOS: { duda: typeof ESPECIFICIDAD; comentario: string; esperado: string }[] = [
  { duda: ESPECIFICIDAD, comentario: "Gana el id, porque tiene más especificidad que una clase (1-0-0 frente a 0-1-0).", esperado: "correcta" },
  { duda: ESPECIFICIDAD, comentario: "Se aplica el del id: los id pesan más que las clases al calcular la especificidad.", esperado: "correcta" },
  { duda: ESPECIFICIDAD, comentario: "Creo que gana el id porque es más importante, pero no sé muy bien por qué.", esperado: "aproximada" },
  { duda: ESPECIFICIDAD, comentario: "Gana la clase porque está escrita después en el CSS.", esperado: "incorrecta" },
  { duda: ESPECIFICIDAD, comentario: "¡Gracias por preguntarlo, yo tenía la misma duda!", esperado: "no_respuesta" },
  { duda: ESPECIFICIDAD, comentario: "¿Y si uso !important qué pasa?", esperado: "no_respuesta" },
  { duda: CAJA, comentario: "Porque por defecto box-sizing es content-box: el ancho no incluye el padding ni el borde (200 + 40 + 4 = 244). Con box-sizing: border-box medirá 200px.", esperado: "correcta" },
  { duda: CAJA, comentario: "Es por el padding, que se suma al ancho.", esperado: "aproximada" },
  { duda: CAJA, comentario: "Es un fallo del navegador, prueba con otro.", esperado: "incorrecta" },
  { duda: CAJA, comentario: "Buena pregunta, a mí me pasó ayer haciendo la práctica.", esperado: "no_respuesta" },
  { duda: CAJA, comentario: "Hay que quitar el margin y ya está.", esperado: "incorrecta" },
  { duda: CAJA, comentario: "Te sobra el borde y el padding: suma 44px. Usa border-box.", esperado: "correcta" },
];

const comoTexto = (r: ResultadoValidacionForo) => (r.tipo === "respuesta" ? r.valoracion : r.tipo);

async function main() {
  const config = getConfigIAForo();
  if (config.simulado) {
    console.error("✗ Falta AI_FORO_API_KEY en .env.local: sin clave la IA del foro está en modo simulado.");
    process.exit(1);
  }
  console.log(`Modelo: ${config.modelo} · umbral de confianza: ${config.umbralConfianza}\n`);

  let aciertos = 0;
  for (const caso of CASOS) {
    let obtenido: string;
    try {
      obtenido = comoTexto(await validarComentarioForo({ duda: caso.duda, comentario: caso.comentario }));
    } catch (e) {
      obtenido = `ERROR (${e instanceof Error ? e.message : e})`;
    }
    const ok = obtenido === caso.esperado;
    if (ok) aciertos++;
    console.log(`${ok ? "✓" : "✗"} esperado ${caso.esperado.padEnd(12)} obtenido ${obtenido.padEnd(12)} «${caso.comentario.slice(0, 60)}…»`);
  }
  console.log(`\n${aciertos} de ${CASOS.length} aciertos («dudosa» = confianza por debajo del umbral, queda para el profesor).`);
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
