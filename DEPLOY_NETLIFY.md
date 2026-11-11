# Publicar en Netlify Drop

Este proyecto es una aplicación estática de Vite. La carpeta que se publica es `dist/`.

## Crear la publicación

1. Desde la carpeta del proyecto, ejecuta `npm ci` y después `npm run build`.
2. Abre [Netlify Drop](https://app.netlify.com/drop).
3. Arrastra la carpeta `dist/` al área de publicación.
4. Netlify generará una URL para compartir. Guarda esa dirección.

Para publicar cambios, vuelve a ejecutar `npm run build` y arrastra la nueva carpeta `dist/` al sitio existente en Netlify.

El archivo `netlify.toml` también deja configurado el comando de build y el directorio de publicación si posteriormente se conecta el proyecto a un repositorio Git.

## Privacidad

El libro incluye fotografías personales. La URL de Netlify permite que quienes la tengan accedan al sitio; comparte el enlace solo con las personas previstas.
