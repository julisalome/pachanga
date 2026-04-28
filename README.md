# ⚽ Torneo Viernes

Tabla de posiciones individual para el torneo de fútbol del viernes.

## Archivos

```
torneo-viernes/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Cómo subir a GitHub Pages

1. Creá un repositorio nuevo en [github.com](https://github.com) (ej: `torneo-viernes`)
2. Subí los 3 archivos: `index.html`, `style.css`, `app.js`
3. Andá a **Settings → Pages**
4. En "Source" elegí **Deploy from a branch → main → / (root)**
5. Guardá. En unos segundos tu app va a estar en:
   `https://TU-USUARIO.github.io/torneo-viernes/`

## Funciones

- **Tabla**: posiciones ordenadas por Pts → Ef% → DG. Top 3 resaltados en oro/plata/bronce.
- **Cargar partido**: seleccionás los jugadores de cada equipo con un toque, cargás los goles.
- **Historial**: lista de todos los partidos con opción de borrar.
- **Jugadores**: alta/baja del plantel.
- **Descargar imagen**: exporta la tabla como PNG lista para compartir.
- **Compartir por WhatsApp**: abre WhatsApp con la tabla formateada como texto.

## Datos

Los datos se guardan en `localStorage` del navegador. Son locales al dispositivo.
Para resetear el torneo: Jugadores → "Resetear torneo".
