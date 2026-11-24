"""
Descarga y limpia las transcripciones de los vídeos del catálogo (issue #11).

    python scripts/transcripciones/descargar.py            → todos los vídeos con youtubeId
    python scripts/transcripciones/descargar.py v04 v05    → solo esos vídeos

Requisitos: Python 3.10+ y yt-dlp (`pip install yt-dlp`). No descarga el vídeo ni el audio:
solo los subtítulos en español que ofrece YouTube.

Qué hace con cada vídeo de data/catalog.json:
  1. Descarga sus subtítulos en español en formato VTT (los hechos a mano si existen; si no,
     los automáticos de YouTube) en una carpeta temporal, fuera del repositorio.
  2. Los limpia. Los automáticos repiten cada frase 2 o 3 veces porque en pantalla «ruedan»
     de una línea a la siguiente; sin limpiar, el temario que recibe el tutor duplicaría tokens.
     Nos quedamos solo con la línea nueva de cada trozo y quitamos las etiquetas de tiempo por palabra.
  3. Agrupa las líneas en bloques de unos 10 segundos, conservando el segundo en que empieza cada
     bloque (es lo que permite al tutor citar el minuto exacto).
  4. Lo guarda en data/transcripciones/<id>.vtt y añade "transcripcion": "<id>.vtt" al vídeo en
     data/catalog.json.

Al final muestra cuántas palabras y tokens (aprox.) tiene cada módulo, para el cálculo de costes.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CATALOGO = RAIZ / "data" / "catalog.json"
CARPETA = RAIZ / "data" / "transcripciones"

SEGUNDOS_POR_BLOQUE = 10
TOKENS_POR_PALABRA = 1.4  # estimación para español; la cifra real depende del modelo

TIEMPO = re.compile(r"^(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})")
ETIQUETAS = re.compile(r"<[^>]+>")


def a_segundos(h: str, m: str, s: str, ms: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def formato_tiempo(t: float) -> str:
    ms = round(t * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"


def descargar(youtube_id: str, destino: Path) -> tuple[Path, str]:
    """Descarga los subtítulos en español. Devuelve el fichero y su tipo (manuales o automáticos)."""
    url = f"https://www.youtube.com/watch?v={youtube_id}"
    base = [sys.executable, "-m", "yt_dlp", "--skip-download", "--sub-format", "vtt",
            "-o", str(destino / "%(id)s.%(ext)s"), url]
    # Primero los hechos a mano; si no hay, los automáticos («es-orig» es el reconocimiento original).
    for tipo, opciones in (("manuales", ["--write-subs", "--sub-langs", "es.*"]),
                           ("automáticos", ["--write-auto-subs", "--sub-langs", "es-orig,es"])):
        subprocess.run(base[:3] + opciones + base[3:], capture_output=True, check=False)
        ficheros = sorted(destino.glob(f"{youtube_id}.*.vtt"))
        if ficheros:
            orig = [f for f in ficheros if ".es-orig." in f.name]
            return (orig or ficheros)[0], tipo
    raise RuntimeError(f"El vídeo {youtube_id} no tiene subtítulos en español (habría que usar Whisper)")


def limpiar(vtt: str) -> list[tuple[float, float, str]]:
    """Devuelve las líneas nuevas de cada trozo como (inicio, fin, texto), sin repeticiones."""
    lineas_nuevas: list[tuple[float, float, str]] = []
    for bloque in vtt.replace("\r", "").split("\n\n"):
        lineas = bloque.split("\n")
        i = next((n for n, l in enumerate(lineas) if TIEMPO.match(l)), None)
        if i is None:
            continue
        g = TIEMPO.match(lineas[i]).groups()
        inicio, fin = a_segundos(*g[:4]), a_segundos(*g[4:])
        texto = lineas[i + 1:]
        # Subtítulos automáticos: la línea nueva es la que lleva marcas de tiempo por palabra.
        con_marcas = [l for l in texto if "<c>" in l or re.search(r"<\d{2}:", l)]
        candidatas = con_marcas if con_marcas else ([] if "<c>" in vtt else texto)
        for l in candidatas:
            limpio = re.sub(r"\s+", " ", ETIQUETAS.sub("", l)).strip()
            if limpio and (not lineas_nuevas or lineas_nuevas[-1][2] != limpio):
                lineas_nuevas.append((inicio, fin, limpio))
    return lineas_nuevas


def agrupar(lineas: list[tuple[float, float, str]]) -> list[tuple[float, float, str]]:
    """Une líneas seguidas en bloques de unos SEGUNDOS_POR_BLOQUE segundos."""
    bloques: list[list] = []
    for inicio, fin, texto in lineas:
        if bloques and inicio - bloques[-1][0] < SEGUNDOS_POR_BLOQUE:
            bloques[-1][1] = fin
            bloques[-1][2] += " " + texto
        else:
            bloques.append([inicio, fin, texto])
    return [tuple(b) for b in bloques]


def escribir_vtt(video: dict, tipo: str, bloques: list[tuple[float, float, str]]) -> str:
    partes = [
        "WEBVTT",
        "",
        "NOTE",
        f"Transcripción de «{video['titulo']}» (https://www.youtube.com/watch?v={video['youtubeId']}).",
        f"Subtítulos {tipo} de YouTube en español, descargados con yt-dlp y limpiados con",
        "scripts/transcripciones/descargar.py (issue #11).",
        "",
    ]
    for inicio, fin, texto in bloques:
        partes += [f"{formato_tiempo(inicio)} --> {formato_tiempo(fin)}", texto, ""]
    return "\n".join(partes)


def anotar_en_catalogo(texto: str, video_id: str) -> str:
    """Añade "transcripcion": "<id>.vtt" a la línea del vídeo, sin reformatear el resto del fichero."""
    patron = re.compile(r'(\{ "id": "%s",[^\n]*?"duracionSegundos": \d+)(, "transcripcion": "[^"]*")?' % re.escape(video_id))
    return patron.sub(lambda m: f'{m.group(1)}, "transcripcion": "{video_id}.vtt"', texto, count=1)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    pedidos = set(sys.argv[1:])
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    texto_catalogo = CATALOGO.read_text(encoding="utf-8")
    CARPETA.mkdir(parents=True, exist_ok=True)

    resumen: dict[str, int] = {}
    with tempfile.TemporaryDirectory() as tmp:
        for modulo in catalogo["curso"]["modulos"]:
            for video in modulo["videos"]:
                if pedidos and video["id"] not in pedidos:
                    continue
                if not video.get("youtubeId"):
                    print(f"– {video['id']}: sin youtubeId, se salta")
                    continue
                fichero, tipo = descargar(video["youtubeId"], Path(tmp))
                bloques = agrupar(limpiar(fichero.read_text(encoding="utf-8")))
                (CARPETA / f"{video['id']}.vtt").write_text(escribir_vtt(video, tipo, bloques), encoding="utf-8", newline="\n")
                texto_catalogo = anotar_en_catalogo(texto_catalogo, video["id"])
                palabras = sum(len(b[2].split()) for b in bloques)
                resumen[modulo["id"]] = resumen.get(modulo["id"], 0) + palabras
                print(f"✔ {video['id']}: subtítulos {tipo}, {len(bloques)} bloques, {palabras} palabras")

    CATALOGO.write_text(texto_catalogo, encoding="utf-8", newline="\n")
    json.loads(texto_catalogo)  # comprueba que el catálogo sigue siendo JSON válido

    print("\nTamaño del temario por módulo (lo que recibe el tutor en cada pregunta):")
    for modulo_id, palabras in resumen.items():
        print(f"  {modulo_id}: {palabras} palabras ≈ {round(palabras * TOKENS_POR_PALABRA):,} tokens".replace(",", "."))


if __name__ == "__main__":
    main()
