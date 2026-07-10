import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

# Generador automático de noticias para el módulo NI.
# Criterio editorial: priorizar fuentes institucionales, organismos reconocidos
# y medios/cadenas de noticias con relevancia pública. Se excluyen blogs,
# páginas personales, redes sociales y sitios sin referencia institucional clara.

MAX_NOTICIAS = 10
DIAS_RECIENTES = 14
DIAS_RELEVANTES = 180

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=es-419&gl=PE&ceid=PE:es-419"

CONSULTAS = [
    '("educación inclusiva" OR "educación especial") (Perú OR Latinoamérica OR Iberoamérica)',
    '("discapacidad" OR "accesibilidad") (educación OR escuela OR estudiantes) Perú',
    '("CEBE" OR "PRITE" OR "SAANEE") Perú educación especial',
    'site:gob.pe ("educación inclusiva" OR "educación especial" OR discapacidad)',
    'site:minedu.gob.pe ("educación inclusiva" OR discapacidad OR CEBE OR PRITE)',
    'site:elperuano.pe ("educación inclusiva" OR discapacidad OR accesibilidad)',
    'site:andina.pe ("educación inclusiva" OR discapacidad OR accesibilidad)',
    'site:unesco.org ("educación inclusiva" OR discapacidad OR accesibilidad)',
    'site:unicef.org ("educación inclusiva" OR discapacidad OR accesibilidad)',
    'site:oei.int ("educación inclusiva" OR discapacidad OR accesibilidad)',
]

FUENTES_INSTITUCIONALES = {
    "gob.pe",
    "minedu",
    "ministerio de educación",
    "ministerio de educacion",
    "el peruano",
    "andina",
    "conadis",
    "defensoría del pueblo",
    "defensoria del pueblo",
    "unesco",
    "unicef",
    "oei",
    "cepal",
    "naciones unidas",
    "onu",
    "banco mundial",
    "world bank",
    "organización mundial de la salud",
    "organizacion mundial de la salud",
    "oms",
    "ops",
}

MEDIOS_RELEVANTES = {
    "andina",
    "el peruano",
    "rpp",
    "tvperú",
    "tvperu",
    "el comercio",
    "la república",
    "la republica",
    "gestión",
    "gestion",
    "agencia efe",
    "efe",
    "bbc news mundo",
    "bbc",
    "dw español",
    "dw",
    "france 24",
    "cnn en español",
    "cnn",
    "el país",
    "el pais",
    "américa futura",
    "america futura",
    "cadena ser",
    "europa press",
]

DOMINIOS_PERMITIDOS = {
    "gob.pe",
    "minedu.gob.pe",
    "elperuano.pe",
    "andina.pe",
    "rpp.pe",
    "tvperu.gob.pe",
    "elcomercio.pe",
    "larepublica.pe",
    "gestion.pe",
    "efe.com",
    "bbc.com",
    "dw.com",
    "france24.com",
    "cnn.com",
    "elpais.com",
    "cadenaser.com",
    "europapress.es",
    "unesco.org",
    "unicef.org",
    "oei.int",
    "cepal.org",
    "worldbank.org",
    "who.int",
    "paho.org",
}

DOMINIOS_EXCLUIDOS = {
    "blogspot.com",
    "wordpress.com",
    "facebook.com",
    "instagram.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "youtube.com",
    "pinterest.com",
    "medium.com",
    "reddit.com",
}

PALABRAS_CLAVE = [
    "educación inclusiva",
    "educacion inclusiva",
    "educación especial",
    "educacion especial",
    "discapacidad",
    "accesibilidad",
    "inclusión",
    "inclusion",
    "cebe",
    "prite",
    "saanee",
    "tea",
    "tdah",
    "braille",
    "lengua de señas",
    "lengua de senas",
    "ajustes razonables",
    "necesidades educativas",
]

CATEGORIAS = [
    ("Educación especial", ["cebe", "prite", "saanee", "educación especial", "educacion especial"]),
    ("Educación inclusiva y políticas públicas", ["educación inclusiva", "educacion inclusiva", "política", "politica", "ministerio", "minedu"]),
    ("Accesibilidad y derechos", ["accesibilidad", "derechos", "ajustes razonables", "discapacidad"]),
    ("Neurodiversidad", ["tea", "tdah", "autismo", "neurodiversidad"]),
    ("Recursos y comunicación accesible", ["braille", "lengua de señas", "lengua de senas", "materiales accesibles"]),
]


def normalizar(texto):
    texto = str(texto or "").lower()
    reemplazos = str.maketrans("áéíóúüñ", "aeiouun")
    return texto.translate(reemplazos)


def limpiar_html(texto):
    texto = html.unescape(str(texto or ""))
    texto = re.sub(r"<[^>]+>", " ", texto)
    texto = re.sub(r"https?://\S+", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def dominio_base(url):
    try:
        netloc = urllib.parse.urlparse(url).netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return ""


def dominio_permitido(url):
    dominio = dominio_base(url)
    if not dominio:
        return False
    if any(dominio == excluido or dominio.endswith("." + excluido) for excluido in DOMINIOS_EXCLUIDOS):
        return False
    return any(dominio == permitido or dominio.endswith("." + permitido) for permitido in DOMINIOS_PERMITIDOS)


def fuente_permitida(nombre_fuente, url_fuente):
    fuente = normalizar(nombre_fuente)
    url = normalizar(url_fuente)

    if dominio_permitido(url_fuente):
        return True

    return any(f in fuente or f in url for f in FUENTES_INSTITUCIONALES | MEDIOS_RELEVANTES)


def es_tema_relevante(titulo, resumen):
    contenido = normalizar(f"{titulo} {resumen}")
    return any(palabra in contenido for palabra in [normalizar(p) for p in PALABRAS_CLAVE])


def clasificar_categoria(titulo, resumen):
    contenido = normalizar(f"{titulo} {resumen}")
    for categoria, claves in CATEGORIAS:
        if any(normalizar(clave) in contenido for clave in claves):
            return categoria
    return "Inclusión educativa"


def fecha_iso(pub_date):
    if not pub_date:
        return datetime.now(timezone.utc).date().isoformat()
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(pub_date).date().isoformat()
    except Exception:
        return datetime.now(timezone.utc).date().isoformat()


def dias_desde(fecha):
    try:
        fecha_dt = datetime.fromisoformat(fecha).date()
        hoy = datetime.now(timezone.utc).date()
        return (hoy - fecha_dt).days
    except Exception:
        return 9999


def leer_feed(consulta):
    url = GOOGLE_NEWS_RSS.format(query=urllib.parse.quote_plus(consulta))
    solicitud = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(solicitud, timeout=20) as respuesta:
        contenido = respuesta.read()
    return ET.fromstring(contenido)


def extraer_noticias():
    noticias = []
    claves = set()

    for consulta in CONSULTAS:
        try:
            raiz = leer_feed(consulta)
        except Exception:
            continue

        for item in raiz.findall("./channel/item"):
            titulo = limpiar_html(item.findtext("title"))
            resumen = limpiar_html(item.findtext("description"))
            enlace = item.findtext("link") or ""
            fecha = fecha_iso(item.findtext("pubDate"))
            source = item.find("source")
            fuente = limpiar_html(source.text if source is not None else "Google News")
            url_fuente = source.attrib.get("url", "") if source is not None else ""

            if not titulo or not enlace:
                continue
            if dias_desde(fecha) < 0 or dias_desde(fecha) > DIAS_RELEVANTES:
                continue
            if not fuente_permitida(fuente, url_fuente):
                continue
            if not es_tema_relevante(titulo, resumen):
                continue

            clave = normalizar(f"{titulo}-{fuente}")
            if clave in claves:
                continue
            claves.add(clave)

            noticias.append({
                "titulo": titulo,
                "fuente": fuente,
                "fecha": fecha,
                "categoria": clasificar_categoria(titulo, resumen),
                "resumen": resumen or "Noticia vinculada con educación inclusiva, accesibilidad o atención a la diversidad.",
                "url": enlace,
                "palabras": [p for p in PALABRAS_CLAVE if normalizar(p) in normalizar(f"{titulo} {resumen}")][:5],
                "tipo_fuente": "Institucional / entidad" if any(f in normalizar(fuente) for f in FUENTES_INSTITUCIONALES) else "Medio relevante",
            })

    noticias.sort(key=lambda n: n["fecha"], reverse=True)

    recientes = [n for n in noticias if dias_desde(n["fecha"]) <= DIAS_RECIENTES]
    anteriores = [n for n in noticias if DIAS_RECIENTES < dias_desde(n["fecha"]) <= DIAS_RELEVANTES]

    seleccion = []
    seleccion.extend(recientes[:4])
    seleccion.extend(anteriores[: MAX_NOTICIAS - len(seleccion)])
    seleccion.extend([n for n in noticias if n not in seleccion][: MAX_NOTICIAS - len(seleccion)])

    return seleccion[:MAX_NOTICIAS]


def main():
    noticias = extraer_noticias()
    output = {
        "actualizado": datetime.now(timezone.utc).isoformat(),
        "criterio": "Fuentes institucionales, entidades públicas, organismos reconocidos y medios de relevancia informativa.",
        "noticias": noticias,
    }
    Path("noticias.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
