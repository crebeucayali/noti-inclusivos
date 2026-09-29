(() => {
  const APP_ID = "1743067010248486";
  const enlaces = document.querySelectorAll("[data-compartir-facebook], .compartir-facebook");
  if (!enlaces.length) return;

  const urlActual = () => {
    const actual = new URL(window.location.href);
    actual.hash = "";
    return actual.href;
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
  });
})();
