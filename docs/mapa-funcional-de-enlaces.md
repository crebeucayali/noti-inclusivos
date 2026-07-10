# Mapa funcional de enlaces de Noti Inclusivos

Este documento describe la función del enlace raíz, los controles de búsqueda, filtros y enlaces principales del repositorio **Noti Inclusivos - NI**.

## Enlace raíz

La página `index.html` funciona como entrada principal del boletín digital. Desde esta página se presentan las noticias y publicaciones disponibles.

## Buscador

El campo de búsqueda permite localizar publicaciones por título, fuente, tema, resumen, categoría, enlace o palabras clave asociadas.

## Filtro por categoría

El selector de categoría permite mostrar solo las publicaciones vinculadas a un tema específico. Las categorías se generan a partir de los datos cargados en los archivos JSON.

## Tarjetas de publicación

Cada tarjeta puede mostrar:

- Categoría.
- Título.
- Resumen limpio o descripción breve.
- Fecha.
- Fuente.
- Enlace externo, cuando exista.

## Enlaces externos

El botón `Leer noticia completa` abre la fuente original de la publicación en una nueva pestaña. Estos enlaces no son propiedad del proyecto personal y deben conservar su fuente correspondiente.

## Archivos de datos

- `data/noticias.json`: publicaciones manuales registradas para el boletín.
- `data/noticias-rss.json`: noticias obtenidas o procesadas desde fuentes RSS.

## Funcionamiento general

El archivo `app.js` carga las publicaciones, une datos manuales y RSS, elimina duplicados por enlace o título-fuente, ordena por fecha descendente, genera categorías, permite búsqueda y muestra resultados en tarjetas.

## Finalidad del mapa

Este documento permite comprender cómo se accede a la información del boletín y qué función cumple cada parte visible del enlace raíz.

## Autoría

La organización funcional de estos enlaces forma parte del **proyecto personal y desarrollo original del Psicólogo Gabriel Berrospi**.