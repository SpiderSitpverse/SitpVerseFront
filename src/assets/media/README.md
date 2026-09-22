# Imágenes de marca

Assets reales del sistema TransMilenio usados en la app:

| Archivo             | Dónde se usa                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| `logo.jpg`            | `src/components/brand/SpiderverseLogo.tsx` — logo en el sidebar            |
| `home-hero-1.jpg`     | `src/pages/HomePage.tsx` — panel "Sistema integrado"                       |
| `home-hero-2.jpg`     | `src/pages/HomePage.tsx` — banner "Flota TransMilenio"                     |
| `login.jpg`            | `src/pages/LoginPage.tsx` — panel lateral de inicio de sesión              |

Para reemplazar cualquiera de estos por una versión más reciente, sobrescribe el
archivo con el mismo nombre — el import ya apunta a esa ruta, no hay que tocar código.

`routes-map.png` ya no se usa: el panel "Mapa de operaciones" en `FleetPage.tsx`
ahora es un mapa interactivo real (Leaflet) — ver `src/components/fleet/TransMilenioMap.tsx`
y `src/data/routes.ts`.
