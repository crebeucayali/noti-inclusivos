(() => {
  "use strict";

  const APP_ID = "1743067010248486";
  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const enlaces = document.querySelectorAll("[data-compartir-facebook], .compartir-facebook");
  if (!enlaces.length) return;

  const RUTAS_MODULOS = [
    ["/capacitaciones", "capacitaciones"],
    ["/banco-digital-accesible", "bda"],
    ["/materiales-educativos-accesibles", "mea"],
    ["/noti-inclusivos", "noti_inclusivos"],
    ["/repositorio-accesible", "repositorio_accesible"],
    ["/DUA-3.0", "dua_3"],
    ["/accesos-complementarios", "accesos_complementarios"]
  ];

  let ultimoRegistro = 0;

  const urlActual = () => {
    const actual = new URL(window.location.href);
    actual.hash = "";
    return actual.href;
  };

  const paginaActual = () => {
    let ruta = String(window.location.pathname || "/");
    ruta = ruta.replace(/index\.html$/i, "");
    return ruta || "/";
  };

  const moduloActual = () => {
    const ruta = paginaActual();
    const coincidencia = RUTAS_MODULOS.find(([prefijo]) =>
      ruta === prefijo || ruta.startsWith(prefijo + "/")
    );
    return coincidencia?.[1] || "principal";
  };

  const crearDialogo = (url) => {
    const parametros = new URLSearchParams({
      app_id: APP_ID,
      display: "popup",
      href: url,
      redirect_uri: url,
    });

    return "https://www.facebook.com/dialog/share?" + parametros.toString();
  };

  const registrarAccionCompartir = () => {
    const ahora = Date.now();
    if (ahora - ultimoRegistro < 1500) return;
    ultimoRegistro = ahora;

    fetch(SUPABASE_URL + "/rest/v1/eva_compartidos_eventos", {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        modulo: moduloActual(),
        pagina: paginaActual()
      }),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "strict-origin-when-cross-origin",
      keepalive: true
    }).then((respuesta) => {
      document.documentElement.dataset.evaCompartir =
        respuesta.ok ? "registrada" : "error";
    }).catch(() => {
      document.documentElement.dataset.evaCompartir = "error";
    });
  };

  enlaces.forEach((enlace) => {
    enlace.href = crearDialogo(urlActual());
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.textContent = "Compartir";
    enlace.setAttribute("aria-label", "Compartir este contenido");

    const contenedor = enlace.closest(".compartir-eva");
    const descripcion = contenedor?.querySelector("p");
    if (descripcion?.textContent?.includes("Facebook")) {
      descripcion.textContent = "Comparte este contenido.";
    }

    enlace.addEventListener("click", registrarAccionCompartir);
  });
})();
