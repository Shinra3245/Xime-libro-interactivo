# Nuestra historia

Libro interactivo romántico construido con React, TypeScript, Vite y Three.js. Incluye una escena 3D de jardín, paseo de cámara, animación de portada, páginas interactivas y música de fondo integrada mediante el reproductor de YouTube.

## Requisitos

- Node.js 22 o posterior
- npm
- Navegador moderno con WebGL para la escena 3D

## Ejecutar en local

```bash
npm ci
npm run dev
```

Vite mostrará la dirección local en la terminal. Para generar una versión lista para publicar:

```bash
npm run build
npm run preview
```

## Fotografías personales

Las fotos no se incluyen en este repositorio. Para que aparezcan en el libro, copia tus imágenes localmente a `public/images/recuerdos/` con estos nombres:

- `recuerdo-01.jpg` a `recuerdo-07.jpg`
- `dos-anos.jpg`
- `dos-anos-dos-meses.jpg`

La carpeta y los archivos de fotografías están excluidos de Git. Si faltan, el libro muestra una tarjeta decorativa para indicar dónde añadir una imagen.

## Música

La música se reproduce desde un embed de YouTube al pulsar el botón inicial. El navegador requiere una interacción explícita para permitir audio. El video configurado está en `src/App.tsx`.

## Deploy en Netlify

La configuración de build y publicación está en `netlify.toml`. Para publicación manual, genera `dist/` con `npm run build` y sigue [`DEPLOY_NETLIFY.md`](DEPLOY_NETLIFY.md).
