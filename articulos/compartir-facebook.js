(() => {
  const enlaces = document.querySelectorAll("[data-compartir-facebook], .compartir-facebook");
  if (!enlaces.length) return;

  const datos = () => {
    const actual = new URL(window.location.href);
    actual.hash = "";
    const descripcion =
      document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
      "Contenido del Ecosistema Virtual Accesible del CREBE Señor de los Milagros - Ucayali.";
    return {
      title: document.title,
      text: descripcion,
      url: actual.href,
    };
  };

  enlaces.forEach((enlace) => {
    const info = datos();
    const fallback =
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(info.url);

    enlace.href = fallback;

    enlace.addEventListener("click", async (evento) => {
      if (typeof navigator.share !== "function" || !window.isSecureContext) return;

      evento.preventDefault();

      try {
        await navigator.share(datos());
      } catch (error) {
        if (error?.name === "AbortError") return;
        window.location.assign(fallback);
      }
    });
  });
})();
