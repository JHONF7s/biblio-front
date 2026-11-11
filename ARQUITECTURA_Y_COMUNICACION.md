# Arquitectura Técnica y Patrones de Comunicación (`core / shared / features`)

Este documento describe la arquitectura de **BiblioTech Frontend** en **Angular 22 (Zoneless + Signals)**, la organización modular bajo **Atomic Design**, la capa de seguridad HTTP/JWT y las estrategias de comunicación reactiva entre componentes.

---

## 1. Fundamentos del Stack Tecnológico

### 1.1 Angular 22 Zoneless (`provideZonelessChangeDetection`)
La aplicación prescinde por completo de `zone.js`. La detección de cambios es conducida exclusivamente por el grafo reactivo de **Signals** (`signal`, `computed`, `effect`, `input`, `output`, `model`):
- Configurado en `src/app/app.config.ts` junto con `provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling(...))` y `provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor]))`.
- Localización registrada en español de Colombia (`es-CO`).

### 1.2 Arquitectura en tres capas (`core`, `shared/ui`, `features`)

```text
src/app/
├── core/                  # Servicios singleton, modelos del contrato HTTP, guards, interceptores y utilidades puras
├── shared/ui/             # Componentes visuales reutilizables organizados por Atomic Design
│   ├── atoms/             # badge, button, input, theme-toggle
│   ├── molecules/         # brand, book-card, search-bar, stat-chip, toast
│   ├── organisms/         # header, site-footer, book-grid, loan-drawer, reserva-dialog
│   └── templates/         # main-layout (contenedor padre de todas las rutas)
└── features/              # Páginas enrutadas con carga diferida (lazy loading)
    ├── home/              # '/' (HomePageComponent)
    ├── auth/              # '/login' (LoginPageComponent: login + registro)
    ├── catalog/           # '/catalog' y '/catalog/:id'
    ├── loans/             # '/loans' (LoansPageComponent)
    └── not-found/         # '**' (NoEncontradoPageComponent)
```

---

## 2. Seguridad, Autenticación JWT e Interceptores

1. **`AuthService` (`src/app/core/services/auth.service.ts`)**:
   - Autentica contra `POST /api/v1/auth/login` y registra nuevos usuarios en `POST /api/v1/auth/register` (seguido de inicio de sesión automático).
   - Almacena la sesión en `localStorage['biblio.session']` y valida estructuralmente que el token posea 3 segmentos Base64URL válidos y que el claim `exp` no haya vencido (`S-F2`).
   - Programa un temporizador de expiración automática y escucha el evento `storage` de `window` para sincronizar cierres de sesión entre múltiples pestañas abiertas.
   - Cero credenciales quemadas en el código fuente (`R-5`).

2. **`authInterceptor` (`src/app/core/interceptors/auth.interceptor.ts`)**:
   - Adjunta el encabezado `Authorization: Bearer <token>` **únicamente** cuando la URL de la petición comienza con `environment.apiUrl` (`S-F3`), evitando fugas del JWT hacia dominios de terceros.

3. **`errorInterceptor` (`src/app/core/interceptors/error.interceptor.ts`)**:
   - Transforma cualquier `HttpErrorResponse` al tipo uniforme `ApiError { status, mensaje, detalles }`.
   - Ante un `401` fuera de `/auth/**`, ejecuta `logout()` una sola vez, notifica al usuario y redirige a `/login?returnUrl=...` con la ruta saneada (`S-F4`).
   - Ante un `403`, muestra notificación de permisos insuficientes sin destruir la sesión activa.

4. **Guards y saneado de `returnUrl` (`src/app/core/utils/return-url.util.ts`)**:
   - `authGuard` y `authMatchGuard` protegen `/loans`.
   - `guestGuard` evita que un usuario autenticado vuelva a `/login`.
   - `roleGuard(roles)` verifica permisos por rol (`USUARIO` / `ADMIN`).
   - `sanitizarReturnUrl()` rechaza vectores de Open Redirect (`//evil.com`, `/\evil.com`, esquemas `javascript:`, `http:`, `data:`, `%2f%2f`, saltos CRLF y rutas de más de 1024 caracteres).

---

## 3. Sistema de Tema Tri-Estado y Diseño Visual

- **Anti-FOUC (`public/theme-init.js`)**: Script externo cargado en `<head>` (compatible con `Content-Security-Policy: script-src 'self'`) que aplica `.dark-theme` en `<html>` antes del primer pintado si `localStorage['biblio.theme'] === 'dark'`.
- **`ThemeService` (`src/app/core/services/theme.service.ts`)**:
  - Gestiona los 3 estados del botón de dos paralelogramos (`ThemeToggleComponent`):
    - **Neutro (`null`)**: estado inicial cuando no hay preferencia guardada; renderiza tema claro y alinea ambos paralelogramos (`--dy: 0px`).
    - **Oscuro (`'dark'`)**: aplica `.dark-theme` y desplaza el paralelogramo crema hacia arriba (`--dy: -32px`).
    - **Claro (`'light'`)**: remueve `.dark-theme` y desplaza el paralelogramo crema hacia abajo (`--dy: 31px`).
- **Transición del Panel de Préstamos a `/loans`**:
  - El botón «Expandir» en `LoanDrawerComponent` anima el ancho del panel de derecha a izquierda hasta cubrir el `100vw`, navega a `/loans` y cierra el panel al concluir `NavigationEnd`, respetando `prefers-reduced-motion: reduce`.
