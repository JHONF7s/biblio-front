# BiblioTech · Frontend de Biblioteca Universitaria (Angular 22)

Aplicación web frontend para el sistema de gestión y préstamo bibliográfico **BiblioTech**, construida con **Angular 22.2 (Zoneless + Signals)**, **TypeScript 6.0**, arquitectura **Atomic Design (`core / shared / features`)**, sistema de tema tri-estado (claro / neutro / oscuro) sin parpadeo inicial (anti-FOUC) e integración REST autenticada mediante **JWT (Bearer)** contra la API de Biblioteca (`http://localhost:10101/biblioteca/api/v1`).

---

## 1. Requisitos previos

- **Node.js:** `>= 22.x` (incluye `fetch` nativo para el script de contrato `smoke-api.mjs`)
- **npm:** `>= 10.x`
- **API Backend en ejecución:** escuchando en `http://localhost:10101/biblioteca/api/v1` (por defecto en desarrollo)

---

## 2. Instalación y ejecución

```bash
# Instalar dependencias exactas desde package-lock.json
npm ci

# Iniciar el servidor de desarrollo en http://localhost:4200
npm start
```

### Configuración de entornos (`src/environments/`)

| Archivo | Uso | `apiUrl` |
|---|---|---|
| `src/environments/environment.development.ts` | Desarrollo (`ng serve`, `ng test`) | `http://localhost:10101/biblioteca/api/v1` |
| `src/environments/environment.ts` | Producción (`ng build`) | `/biblioteca/api/v1` (ruta relativa para proxy inverso, sin `localhost`) |

---

## 3. Estructura de carpetas

```text
src/
├── environments/
│   ├── environment.ts                   # Configuración de producción
│   └── environment.development.ts       # Configuración local de desarrollo
├── app/
│   ├── core/                            # Capa transversal de dominio, seguridad y estado
│   │   ├── config/
│   │   │   └── site.config.ts           # Metadatos institucionales y enlaces del sitio
│   │   ├── guards/
│   │   │   ├── auth.guard.ts            # authGuard + authMatchGuard con returnUrl saneado
│   │   │   ├── guest.guard.ts           # Redirige a '/' si ya existe sesión activa
│   │   │   └── role.guard.ts            # Fábrica roleGuard(['USUARIO', 'ADMIN'])
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts      # Adjunta Bearer token solo hacia environment.apiUrl
│   │   │   └── error.interceptor.ts     # Normaliza errores HTTP (401, 403, 0, 400, 500)
│   │   ├── models/                      # Contratos TypeScript alineados con los DTOs REST
│   │   ├── services/
│   │   │   ├── auth.service.ts          # Sesión JWT, validación estructural + exp, multi-pestaña
│   │   │   ├── catalogo.service.ts      # Estado reactivo de GET /catalogo y /catalogo/{id}
│   │   │   ├── reservas.service.ts      # Préstamos, disponibilidad, cancelación (> 24 h)
│   │   │   ├── favoritos.service.ts     # Favoritos por usuario + fusión anónimo -> autenticado
│   │   │   ├── theme.service.ts         # Tema tri-estado ('dark' | 'light' | null)
│   │   │   ├── ui-state.service.ts      # Estado del panel lateral, transición y diálogo
│   │   │   └── notification.service.ts  # Alertas/toasts reactivos
│   │   └── utils/
│   │       ├── busqueda-difusa.ts       # Búsqueda difusa ponderada (NFD + Damerau-Levenshtein)
│   │       ├── portada.ts               # Generador determinista de portadas tipográficas
│   │       └── return-url.util.ts       # Saneado anti-Open Redirect (S-F5)
│   │
│   ├── shared/ui/                       # Jerarquía Atomic Design reutilizable
│   │   ├── atoms/                       # badge, button, input, theme-toggle
│   │   ├── molecules/                   # brand, book-card, search-bar, stat-chip, toast
│   │   ├── organisms/                   # header, site-footer, book-grid, loan-drawer, reserva-dialog
│   │   └── templates/                   # main-layout (header + theme-toggle + router-outlet + footer)
│   │
│   └── features/                        # Módulos funcionales cargados con lazy loading
│       ├── home/pages/home-page/        # '/' — Portada pública con estadísticas y catálogo real
│       ├── auth/pages/login-page/       # '/login' — Inicio de sesión y registro con pestañas
│       ├── catalog/pages/
│       │   ├── catalog-page/            # '/catalog' — Catálogo con sidebar desplegable y búsqueda difusa
│       │   └── book-detail-page/        # '/catalog/:id' — Ficha técnica y disponibilidad por fecha
│       ├── loans/pages/loans-page/      # '/loans' — Gestión completa de préstamos (protegida)
│       └── not-found/pages/             # '**' — Página 404 personalizada
```

---

## 4. Tabla de rutas

| Ruta | Acceso | Guard | Descripción |
|---|---|---|---|
| `/` | Pública | — | Página de inicio pública con métricas reales de la API y vista previa del catálogo |
| `/catalog` | Pública | — | Catálogo completo con sidebar desplegable, filtros por autor/género/año/favoritos y búsqueda difusa |
| `/catalog/:id` | Pública | — | Detalle del libro, consulta de disponibilidad por fecha y solicitud de préstamo |
| `/book/:id` | Pública | — | Redirección automática a `/catalog/:id` |
| `/login` | Solo invitados | `guestGuard` | Inicio de sesión y registro en pestañas (`?modo=registro`, `?returnUrl=...`) |
| `/register` | Solo invitados | — | Redirección a `/login?modo=registro` |
| `/loans` | Autenticado (`USUARIO` / `ADMIN`) | `authMatchGuard`, `authGuard` | Página completa de préstamos con pestañas Activas / Finalizadas / Canceladas |
| `**` | Pública | — | Página 404 («Esta página no existe en el catálogo») |

> **Nota de seguridad:** La antigua ruta `/home` sin protección fue eliminada definitivamente (`S-F1`).

---

## 5. Scripts de compilación y pruebas

```bash
# Compilación de producción (verifica presupuestos y cero errores TypeScript/plantillas)
npm run build

# Pruebas unitarias con Vitest (45 pruebas en 9 suites)
npx ng test --watch=false

# Prueba de humo de contrato HTTP contra el backend en vivo (requiere backend en puerto 10101)
API_URL=http://localhost:10101/biblioteca/api/v1 npm run smoke:api

# Pruebas End-to-End (E2E) y verificación visual con Playwright
npm run e2e
```
