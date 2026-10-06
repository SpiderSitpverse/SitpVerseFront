# SitpVerse Front — Spider-Verse TransMilenio Admin

Panel administrativo de flota de buses (TransMilenio) construido con **React + TypeScript + Vite + Tailwind CSS v4**, con animaciones (Framer Motion) y un diseño oscuro y sobrio con acentos rojos.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (vía `@tailwindcss/vite`, sin `tailwind.config.js` — tokens definidos en `src/index.css`)
- **React Router v7** para las rutas, con sesión protegida por `AuthProvider` + `ProtectedRoute`
- **Framer Motion** para animaciones (transiciones de página, tabs, drawer móvil, contadores, modales)
- **Leaflet + react-leaflet** para el mapa de troncales (teselas gratuitas de Esri, sin API key)
- **lucide-react** para iconografía

## Estructura de carpetas

```
src/
  assets/media/       Imágenes reales de marca (logo, fotos del home, foto del login)
  components/
    auth/             ProtectedRoute
    brand/            Logo / lockup de marca
    fleet/            Piezas del dominio "flota": lista de buses, mapa (TransMilenioMap),
                       leyenda de troncales, modal de reporte + galería de fotos, blueprint SVG
    incidents/        Modal de acciones sobre un incidente (alertas, mantenimiento, rutas, instrucciones)
    layout/           Sidebar, Topbar, PageHeader, AppLayout (shell de la app)
    ui/               Componentes reutilizables genéricos (Button, Card, Badge, Modal, StatCard, Tabs, etc.)
  context/            AuthContext (sesión por pestaña en sessionStorage)
  data/               Geometría de referencia del mapa (troncales y estaciones oficiales)
  hooks/              useFleetData (puntos de conexión con el back), reloj en vivo, contador animado
  lib/                Utilidades (cn, mapeos de estado/color, auth.ts)
  pages/              Una página por ruta (incluye LoginPage, pública)
  types/              Tipos de dominio compartidos
```

Cada página (`src/pages/*`) compone componentes de `ui/`, `layout/` y del dominio correspondiente — no hay lógica de UI duplicada entre páginas.

## Conexión con el back

El front **no trae datos de ejemplo**: todo arranca vacío y las pantallas muestran su estado vacío
hasta conectar el back (NestJS, contrato en `SitpVerseBack/docs/API.md`). Los puntos de conexión son:

| Qué | Dónde | Endpoint del back |
| --- | --- | --- |
| Login / cambio de contraseña | `src/lib/auth.ts` (`verifyLogin`, `changePassword`) | `POST /auth/login` (por `employeeId`) |
| Buses, resumen, ruta asignada, incidentes, personal | `src/hooks/useFleetData.ts` | `/fleet/*`, `/assistance/*`, `/users` |
| Reporte de inspección de un bus | `src/lib/busReportClient.ts`, `src/hooks/useBusReport.ts` | `/inspections/buses/:id/latest` |
| Viajes activos y llamados de ayuda | `src/lib/fleetActivityClient.ts` | `/fleet/*`, `/assistance/*` + WebSocket `/realtime` |
| Reparaciones del taller | `src/lib/repairClient.ts` | flujo de reparaciones de API.md |

Los clientes `*Client` exponen una interfaz y hoy una implementación en `localStorage`; basta con
sustituir la implementación por llamadas HTTP. La URL del back va en `VITE_API_URL`
(p. ej. `https://sitpverse2026-api.azurewebsites.net`). Las fotos deben subirse a
`POST /files/images` y guardar la URL devuelta.

## Mapa de troncales

`src/components/fleet/TransMilenioMap.tsx` dibuja las troncales y estaciones sobre un mapa real
(Leaflet + teselas oscuras gratuitas de Esri, sin API key ni facturación). Los datos en
`src/data/routes.ts` son **oficiales**: 10 troncales y ~150 estaciones con coordenadas reales,
obtenidas del propio mapa digital de TransMilenio
(`https://api.buscador-rutas.transmilenio.gov.co/api/v1/arcgis/estaciones`, la misma API que usa
mapadigital.transmilenio.gov.co). Cada troncal conecta sus estaciones reales en orden, así que la
línea sigue las avenidas de verdad en vez de un trazo aproximado. Los nombres de estación se
muestran al hacer zoom (nivel ≥ 15) para no saturar la vista general; los portales siempre son
visibles. Para actualizar el dataset si la red cambia, se puede volver a consultar esa misma API.

## Imágenes de marca

Ver [`src/assets/media/README.md`](src/assets/media/README.md): lista qué archivo es cada imagen y en qué componente se usa.

## Scripts

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # type-check + build de producción
npm run lint      # oxlint
```
