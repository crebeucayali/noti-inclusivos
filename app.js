const listaNoti = document.querySelector("#lista-noti");
const busquedaNoti = document.querySelector("#busqueda-noti");
const filtroCategoria = document.querySelector("#filtro-categoria");
const filtroTiempo = document.querySelector("#filtro-tiempo");
const contadorNoti = document.querySelector("#contador-noti");
const estadoNoti = document.querySelector("#estado-noti");
const tituloLista = document.querySelector("#titulo-lista-noti");
const descripcionLista = document.querySelector("#descripcion-lista-noti");

const DIAS_RECIENTES = 90;
const DIAS_RELEVANTES = 180;
let publicaciones = [];

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerEnlace(publicacion) {
  return publicacion.url || publicacion.enlace || "#";
}

function limpiarResumen(resumen) {
  const texto = String(resumen || "")
    .replace(/&lt;[^&]*?&gt;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  return texto && texto.length >= 20 ? texto : "Noticia publicada por la fuente indicada.";
}

function obtenerTiempoFecha(fecha) {
  const textoFecha = String(fecha || "").trim();
  if (!textoFecha) return 0;

  const fechaIso = new Date(textoFecha);
  if (!Number.isNaN(fechaIso.getTime())) return fechaIso.getTime();

  const meses = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11
  };

  const coincidencia = normalizar(textoFecha).match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
  if (!coincidencia) return 0;

  const dia = Number(coincidencia[1]);
  const mes = meses[coincidencia[2]];
  const anio = Number(coincidencia[3]);
  if (!dia || mes === undefined || !anio) return 0;

  return new Date(anio, mes, dia).getTime();
}

function estaDentroDeDias(publicacion, dias) {
  const tiempo = obtenerTiempoFecha(publicacion.fecha);
  if (!tiempo) return false;

  const ahora = Date.now();
  const limiteInferior = ahora - dias * 24 * 60 * 60 * 1000;
  const margenFuturo = ahora + 24 * 60 * 60 * 1000;

  return tiempo >= limiteInferior && tiempo <= margenFuturo;
}

function esReciente(publicacion) {
  return estaDentroDeDias(publicacion, DIAS_RECIENTES);
}

function esRelevanteComplementaria(publicacion) {
  return estaDentroDeDias(publicacion, DIAS_RELEVANTES) && !esReciente(publicacion);
}

function esVisible(publicacion) {
  return esReciente(publicacion) || esRelevanteComplementaria(publicacion);
}

function ordenarPorFechaDescendente(lista) {
  return [...lista].sort((a, b) => obtenerTiempoFecha(b.fecha) - obtenerTiempoFecha(a.fecha));
}

function crearElementoTexto(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}

function crearTarjeta(publicacion) {
  const articulo = document.createElement("article");
  articulo.className = "tarjeta-noti";

  const categoria = publicacion.categoria || publicacion.tema || "General";
  const contenido = document.createElement("div");

  contenido.appendChild(crearElementoTexto("span", "etiqueta-noti", categoria));
  contenido.appendChild(crearElementoTexto("h3", "", publicacion.titulo || "Publicación sin título"));
  contenido.appendChild(crearElementoTexto("p", "", limpiarResumen(publicacion.resumen)));

  const meta = document.createElement("div");
  meta.className = "meta-noti";
  meta.appendChild(crearElementoTexto("p", "fecha-noti", publicacion.fecha || "Fecha pendiente"));
  meta.appendChild(crearElementoTexto("p", "fuente-noti", publicacion.fuente || "Fuente institucional"));

  const enlace = obtenerEnlace(publicacion);
  if (enlace && enlace !== "#") {
    const boton = document.createElement("a");
    boton.className = "enlace-noti";
    boton.href = enlace;
    boton.target = "_blank";
    boton.rel = "noopener noreferrer";
    boton.textContent = "Leer noticia completa";
    meta.appendChild(boton);
  }

  articulo.appendChild(contenido);
  articulo.appendChild(meta);
  return articulo;
}

function ajustarInterfazTiempo() {
  if (filtroTiempo) {
    filtroTiempo.value = "recientes";
    filtroTiempo.disabled = true;
    filtroTiempo.style.display = "none";
  }

  if (tituloLista) tituloLista.textContent = "Noticias recientes";
  if (descripcionLista) descripcionLista.textContent = `Publicaciones de los últimos ${DIAS_RECIENTES} días y noticias relevantes hasta ${DIAS_RELEVANTES} días.`;
}

function crearBloque(titulo, descripcion, lista, mensajeVacio) {
  const bloque = document.createElement("section");
  bloque.className = "bloque-lista-noti";

  const encabezado = document.createElement("h3");
  encabezado.textContent = titulo;

  const texto = document.createElement("p");
  texto.className = "texto-bloque-noti";
  texto.textContent = descripcion;

  const grid = document.createElement("div");
  grid.className = "grid-noti";

  if (lista.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "estado-vacio";
    vacio.textContent = mensajeVacio;
    grid.appendChild(vacio);
  } else {
    lista.forEach((publicacion) => grid.appendChild(crearTarjeta(publicacion)));
  }

  bloque.appendChild(encabezado);
  bloque.appendChild(texto);
  bloque.appendChild(grid);
  return bloque;
}

function mostrarPublicaciones() {
  ajustarInterfazTiempo();

  const textoBusqueda = normalizar(busquedaNoti.value.trim());
  const categoriaSeleccionada = filtroCategoria.value;

  const resultados = publicaciones.filter((publicacion) => {
    const categoria = publicacion.categoria || publicacion.tema || "General";
    const coincideCategoria = categoriaSeleccionada === "todas" || categoria === categoriaSeleccionada;
    const palabras = Array.isArray(publicacion.palabras) ? publicacion.palabras.join(" ") : "";
    const contenido = normalizar(`${publicacion.titulo} ${categoria} ${publicacion.resumen} ${publicacion.fuente || ""} ${obtenerEnlace(publicacion)} ${palabras}`);
    const coincideBusqueda = contenido.includes(textoBusqueda);

    return coincideCategoria && coincideBusqueda && esVisible(publicacion);
  });

  const recientes = resultados.filter(esReciente);
  const relevantes = resultados.filter(esRelevanteComplementaria);

  listaNoti.innerHTML = "";
  listaNoti.style.display = "block";

  listaNoti.appendChild(crearBloque(
    "Noticias recientes",
    `Publicaciones de los últimos ${DIAS_RECIENTES} días.`,
    recientes,
    `No hay noticias de los últimos ${DIAS_RECIENTES} días con esos criterios.`
  ));

  listaNoti.appendChild(crearBloque(
    "Más noticias relevantes",
    `Publicaciones relacionadas entre ${DIAS_RECIENTES + 1} y ${DIAS_RELEVANTES} días. No se muestran noticias anteriores a ${DIAS_RELEVANTES} días.`,
    relevantes,
    `No hay noticias relevantes entre ${DIAS_RECIENTES + 1} y ${DIAS_RELEVANTES} días con esos criterios.`
  ));

  contadorNoti.textContent = `${resultados.length} publicación(es) encontrada(s): ${recientes.length} reciente(s) y ${relevantes.length} relevante(s).`;
}

function cargarCategorias() {
  filtroCategoria.innerHTML = '<option value="todas">Todas</option>';

  const categorias = [...new Set(publicaciones
    .filter(esVisible)
    .map((publicacion) => publicacion.categoria || publicacion.tema || "General"))]
    .sort((a, b) => a.localeCompare(b, "es"));

  categorias.forEach((categoria) => {
    const opcion = document.createElement("option");
    opcion.value = categoria;
    opcion.textContent = categoria;
    filtroCategoria.appendChild(opcion);
  });
}

async function cargarJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) return [];

  const data = await respuesta.json();
  return Array.isArray(data) ? data : (Array.isArray(data.noticias) ? data.noticias : []);
}

function unirSinDuplicados(listaRss, listaManual) {
  const unicas = [];
  const claves = new Set();

  [...listaRss, ...listaManual].forEach((publicacion) => {
    const enlace = obtenerEnlace(publicacion);
    const clave = enlace && enlace !== "#" ? enlace : normalizar(`${publicacion.titulo}-${publicacion.fuente}`);

    if (!claves.has(clave)) {
      claves.add(clave);
      unicas.push(publicacion);
    }
  });

  return unicas;
}

async function iniciarNotiinclusivo() {
  try {
    ajustarInterfazTiempo();

    const [manuales, rss] = await Promise.all([
      cargarJson("data/noticias.json?v=" + Date.now()),
      cargarJson("data/noticias-rss.json?v=" + Date.now())
    ]);

    publicaciones = ordenarPorFechaDescendente(unirSinDuplicados(rss, manuales));
    cargarCategorias();
    mostrarPublicaciones();

    estadoNoti.textContent = `Noticias cargadas correctamente. Se muestran noticias recientes de ${DIAS_RECIENTES} días y relevantes hasta ${DIAS_RELEVANTES} días.`;
  } catch (error) {
    listaNoti.innerHTML = '<p class="estado-vacio">No se pudieron cargar las publicaciones. Inténtalo nuevamente más tarde.</p>';
    contadorNoti.textContent = "";
    estadoNoti.textContent = "No se pudieron cargar las noticias.";
  }
}

busquedaNoti.addEventListener("input", mostrarPublicaciones);
filtroCategoria.addEventListener("change", mostrarPublicaciones);
if (filtroTiempo) filtroTiempo.addEventListener("change", mostrarPublicaciones);

iniciarNotiinclusivo();
