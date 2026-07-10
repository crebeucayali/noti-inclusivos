const fs = require("fs/promises");

const RUTA_DICCIONARIO = "data/diccionario-ni.json";
const RUTA_FUENTES = "rss-feeds.json";
const RUTA_SALIDA = "noticias-rss.json";

const DICCIONARIO_BASE = {
  parametros: {
    dias_recientes: 90,
    dias_relevantes: 180,
    puntaje_minimo: 2,
    max_palabras_detectadas: 10
  },
  categorias: {
    "Educación inclusiva": [
      "inclusión educativa",
      "educacion inclusiva",
      "educación especial",
      "educacion especial",
      "discapacidad",
      "accesibilidad",
      "MINEDU",
      "CONADIS",
      "CEBE",
      "PRITE",
      "TEA",
      "TDAH",
      "Braille",
      "lengua de señas",
      "lengua de senas"
    ]
  },
  combinaciones: [
    ["educación", "discapacidad"],
    ["educacion", "discapacidad"],
    ["MINEDU", "inclusión"],
    ["CONADIS", "educación"],
    ["TEA", "escuela"],
    ["Braille", "educación"],
    ["lengua de señas", "educación"]
  ],
  exclusiones: [
    "farándula",
    "farandula",
    "deportes",
    "apuestas",
    "casino",
    "entretenimiento",
    "publicidad"
  ]
};

function limpiarHtml(texto = "") {
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizar(texto = "") {
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function leerJson(ruta, valorBase = null) {
  try {
    const contenido = await fs.readFile(ruta, "utf8");
    return JSON.parse(contenido);
  } catch (error) {
    if (valorBase !== null) return valorBase;
    throw error;
  }
}

function obtenerEtiqueta(xml, etiqueta) {
  const expresion = new RegExp(`<${etiqueta}[^>]*>([\\s\\S]*?)<\\/${etiqueta}>`, "i");
  const coincidencia = xml.match(expresion);
  if (!coincidencia) return "";
  return limpiarHtml(coincidencia[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
}

function obtenerItems(xml) {
  return xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
}

function obtenerEnlace(item) {
  const linkTexto = obtenerEtiqueta(item, "link");
  if (linkTexto) return linkTexto;

  const href = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return href ? href[1] : "#";
}

function obtenerFecha(item) {
  const fecha = obtenerEtiqueta(item, "pubDate") || obtenerEtiqueta(item, "published") || obtenerEtiqueta(item, "updated");
  if (!fecha) return "Fecha pendiente";

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;

  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Lima"
  });
}

function obtenerEntradasCategorias(diccionario) {
  return Object.entries(diccionario.categorias || {}).flatMap(([categoria, palabras]) => {
    return (palabras || []).map((palabra) => ({ categoria, palabra }));
  });
}

function evaluarPublicacion(publicacion, diccionario) {
  const texto = normalizar(`${publicacion.titulo} ${publicacion.resumen} ${publicacion.categoria} ${publicacion.fuente}`);
  const exclusiones = diccionario.exclusiones || [];

  const tieneExclusion = exclusiones.some((termino) => texto.includes(normalizar(termino)));
  if (tieneExclusion) {
    return { aceptada: false, puntaje: 0, palabras: [], categoriaDetectada: publicacion.categoria };
  }

  const entradas = obtenerEntradasCategorias(diccionario);
  const puntajePorCategoria = new Map();
  const palabrasDetectadas = [];

  for (const entrada of entradas) {
    const termino = normalizar(entrada.palabra);
    if (!termino || !texto.includes(termino)) continue;

    const peso = termino.includes(" ") ? 2 : 1;
    puntajePorCategoria.set(entrada.categoria, (puntajePorCategoria.get(entrada.categoria) || 0) + peso);
    palabrasDetectadas.push(entrada.palabra);
  }

  for (const grupo of diccionario.combinaciones || []) {
    const coincideGrupo = grupo.every((termino) => texto.includes(normalizar(termino)));
    if (coincideGrupo) {
      const nombreGrupo = grupo.join(" + ");
      palabrasDetectadas.push(nombreGrupo);
      puntajePorCategoria.set(publicacion.categoria, (puntajePorCategoria.get(publicacion.categoria) || 0) + 2);
    }
  }

  let categoriaDetectada = publicacion.categoria;
  let puntajeMayor = 0;

  for (const [categoria, puntaje] of puntajePorCategoria.entries()) {
    if (puntaje > puntajeMayor) {
      categoriaDetectada = categoria;
      puntajeMayor = puntaje;
    }
  }

  const puntajeMinimo = diccionario.parametros?.puntaje_minimo || 2;
  const maxPalabras = diccionario.parametros?.max_palabras_detectadas || 10;

  return {
    aceptada: puntajeMayor >= puntajeMinimo,
    puntaje: puntajeMayor,
    palabras: [...new Set(palabrasDetectadas)].slice(0, maxPalabras),
    categoriaDetectada
  };
}

async function obtenerNoticiasDeFuente(fuente, diccionario) {
  const respuesta = await fetch(fuente.url, {
    headers: { "user-agent": "NotiinclusivoCREBE/1.0" }
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo leer ${fuente.nombre}`);
  }

  const xml = await respuesta.text();
  const items = obtenerItems(xml);

  return items.map((item) => {
    const titulo = obtenerEtiqueta(item, "title") || "Publicación sin título";
    const resumen = obtenerEtiqueta(item, "description") || obtenerEtiqueta(item, "summary") || obtenerEtiqueta(item, "content") || "Sin resumen disponible.";
    const publicacionBase = {
      titulo,
      categoria: fuente.categoria || "Noticias RSS",
      fecha: obtenerFecha(item),
      fuente: fuente.nombre,
      resumen: resumen.length > 260 ? `${resumen.slice(0, 257)}...` : resumen,
      enlace: obtenerEnlace(item)
    };

    const evaluacion = evaluarPublicacion(publicacionBase, diccionario);
    if (!evaluacion.aceptada) return null;

    return {
      ...publicacionBase,
      categoria: evaluacion.categoriaDetectada || publicacionBase.categoria,
      puntaje: evaluacion.puntaje,
      palabras: evaluacion.palabras
    };
  }).filter(Boolean);
}

async function main() {
  const diccionario = await leerJson(RUTA_DICCIONARIO, DICCIONARIO_BASE);
  const fuentes = await leerJson(RUTA_FUENTES);
  const noticias = [];

  for (const fuente of fuentes) {
    try {
      const obtenidas = await obtenerNoticiasDeFuente(fuente, diccionario);
      noticias.push(...obtenidas);
    } catch (error) {
      console.warn(error.message);
    }
  }

  const unicas = [];
  const enlaces = new Set();

  for (const noticia of noticias) {
    const clave = noticia.enlace || `${noticia.titulo}-${noticia.fuente}`;
    if (!enlaces.has(clave)) {
      enlaces.add(clave);
      unicas.push(noticia);
    }
  }

  await fs.writeFile(RUTA_SALIDA, `${JSON.stringify(unicas.slice(0, 60), null, 2)}\n`, "utf8");
  console.log(`Noticias RSS guardadas con diccionario ampliado: ${unicas.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
