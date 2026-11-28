import { TextoConCodigo } from "@/components/fuente-video";

type Bloque = { tipo: "p" | "ul" | "ol"; lineas: string[] };

const VINETA = /^\s*[-*•]\s+(.*)$/; // «- uno», «* uno» (no «**negrita**»: tras el asterisco va un espacio)
const NUMERO = /^\s*\d+[.)]\s+(.*)$/; // «1. uno», «2) dos»

/** Parte el texto en párrafos (separados por una línea en blanco) y listas (líneas seguidas con viñeta o número). */
function enBloques(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  let abierto = false; // si la línea siguiente puede seguir el último bloque
  for (const linea of texto.replace(/\r/g, "").split("\n")) {
    if (!linea.trim()) {
      abierto = false;
      continue;
    }
    const vineta = VINETA.exec(linea);
    const numero = vineta ? null : NUMERO.exec(linea);
    const tipo = vineta ? "ul" : numero ? "ol" : "p";
    const contenido = vineta?.[1] ?? numero?.[1] ?? linea;
    const ultimo = bloques.at(-1);
    // Las listas siguen aunque haya una línea en blanco entre elementos; los párrafos, no.
    if (ultimo && ultimo.tipo === tipo && (abierto || tipo !== "p")) ultimo.lineas.push(contenido);
    else bloques.push({ tipo, lineas: [contenido] });
    abierto = true;
  }
  return bloques;
}

/**
 * Texto largo de la IA (p. ej. una respuesta del tutor) con el markdown sencillo que usan los modelos: párrafos,
 * listas con «-», «*» o números, `código` y **negritas**. Nada más: ni enlaces ni HTML, que no hacen falta y podrían
 * colarse en la página.
 */
export function TextoMarkdown({ texto }: { texto: string }) {
  return (
    <>
      {enBloques(texto).map((b, i) =>
        b.tipo === "p" ? (
          <p key={i}>
            <TextoConCodigo texto={b.lineas.join("\n")} />
          </p>
        ) : (
          (() => {
            const Lista = b.tipo;
            return (
              <Lista key={i} className={b.tipo === "ul" ? "list-disc pl-5" : "list-decimal pl-5"}>
                {b.lineas.map((l, j) => (
                  <li key={j}>
                    <TextoConCodigo texto={l} />
                  </li>
                ))}
              </Lista>
            );
          })()
        ),
      )}
    </>
  );
}
