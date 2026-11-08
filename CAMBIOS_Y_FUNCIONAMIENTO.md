# Documentación de Cambios y Funcionamiento: BiblioAngular

Este documento detalla de forma clara y directa **qué cambios se realizaron** en el proyecto, **por qué se tomaron esas decisiones técnicas** y **cómo funciona** la arquitectura resultante.

---

## 1. Contexto Inicial

El proyecto fue generado originalmente mediante el CLI de Angular con la instrucción:
```bash
ng new biblio-angular --style=scss --ssr=false --routing --zoneless --ai-config=none
```

En su estado inicial, el proyecto contenía el código boilerplate predeterminado de bienvenida de Angular (`app.html` con más de 300 líneas de maquetación de ejemplo), sin arquitectura de componentes, sin modelos de datos, sin rutas reales y sin lógica de estado.

---

## 2. ¿Qué cambios se hicieron? (Inventario de Archivos)

Se transformó la aplicación en una plataforma de biblioteca interactiva organizada bajo **Atomic Design** y **Angular Signals**.

### 2.1 Modificaciones a los archivos base existentes

| Archivo | Qué se modificó | Motivo / Propósito |
| :--- | :--- | :--- |
| `src/app/app.config.ts` | Se agregó `provideZonelessChangeDetection()` y `withComponentInputBinding()` al `provideRouter`. | Activar formalmente el motor sin Zone.js y permitir que los parámetros de la URL (`:id`) se lean como señales en las páginas. |
| `src/app/app.html` | Se eliminó todo el código HTML de demostración de Angular y se dejó únicamente `<router-outlet />`. | Limpieza de plantilla para que las páginas cargadas por el router tomen el control visual. |
| `src/app/app.routes.ts` | Se configuraron rutas con lazy loading: ruta raíz `''` (`HomePageComponent`) y ruta de detalle `'book/:id'` (`BookDetailPageComponent`). | Proveer navegación desacoplada y eficiente cargando componentes bajo demanda. |
| `src/app/app.ts` | Se simplificó la clase `App`, eliminando variables de prueba innecesarias. | Mantener el componente raíz como un punto de anclaje limpio. |
| `src/styles.scss` | Se incorporó una paleta de diseño completa con variables CSS (colores primarios, neutros, sombras, bordes y tipografía) y un reset CSS moderno. | Proporcionar una identidad visual consistente a todos los átomos y componentes sin depender de librerías CSS pesadas. |

---

### 2.2 Creación de la capa de Dominio y Estado (`src/app/core/`)

Se crearon modelos e inyectables independientes de la interfaz visual:

- **`src/app/core/models/book.model.ts`**:
  - Define las interfaces `Book`, las categorías permitidas (`BookCategory`), el modelo de préstamo (`LoanInfo`) y las notificaciones (`Notification`).
- **`src/app/core/services/library.service.ts`**:
  - Servicio centralizado tipo Store con Signals (`_books`, `_borrowedBookIds`, `_searchQuery`, `_selectedCategory`, `_isLoanDrawerOpen`).
  - Señales computadas automáticas: `filteredBooks`, `borrowedBooks`, `totalLoansCount`, `stats`.
  - Métodos mutadores: `borrowBook()`, `returnBook()`, `setSearchQuery()`, `setSelectedCategory()`, `toggleLoanDrawer()`.
- **`src/app/core/services/notification.service.ts`**:
  - Servicio para publicar toasts/alertas temporales que desaparecen automáticamente a los 3 segundos mediante Signals.

---

### 2.3 Creación de la jerarquía visual con Atomic Design (`src/app/ui/`)

Se estructuraron componentes de menor a mayor complejidad:

#### A. Átomos (`src/app/ui/atoms/`)
*Componentes puros, enfocados únicamente en UI, sin dependencias de negocio.*
- **`badge`**: Muestra etiquetas de estado o categoría con soporte para variantes de color (`primary`, `success`, `warning`, `neutral`).
- **`button`**: Botón configurable con variantes (`primary`, `secondary`, `outline`, `danger`), estados deshabilitados y soporte de proyección `<ng-content>`. Emite eventos mediante `output()`.
- **`input`**: Campo de texto reutilizable con binding bidireccional moderno utilizando `model<string>()`.

#### B. Moléculas (`src/app/ui/molecules/`)
*Combinaciones de átomos con una función específica.*
- **`search-bar`**: Combina el átomo `input` y un icono/botón de limpieza para emitir términos de búsqueda en tiempo real.
- **`book-card`**: Presenta la portada, datos, badge de categoría y botón de acción para prestar/devolver un libro.
- **`stat-chip`**: Muestra un resumen numérico clave (ej. libros totales, libros prestados).
- **`toast`**: Banner flotante que se muestra en la esquina superior cuando hay mensajes activos en `NotificationService`.

#### C. Organismos (`src/app/ui/organisms/`)
*Bloques funcionales completos de la vista.*
- **`header`**: Barra de navegación superior con logotipo, enlaces y botón de préstamos que exhibe en tiempo real el total de libros en posesión (`loansCount()`).
- **`book-grid`**: Rejilla de libros responsiva que renderiza tarjetas usando el nuevo `@for` y maneja estados vacíos con `@empty`.
- **`loan-drawer`**: Panel lateral deslizante que lista los libros prestados actualmente y permite devolverlos uno a uno o en bloque.

#### D. Templates (`src/app/ui/templates/`)
*Estructuras de layout y slots.*
- **`main-layout`**: Ensambla el `header`, el slot de contenido dinámico `<ng-content>`, el `loan-drawer` y el `toast`.

#### E. Páginas (`src/app/ui/pages/`)
*Vistas vinculadas a rutas que orquestan organismos y servicios.*
- **`home-page`**: Vista principal que muestra métricas del catálogo, barra de búsqueda, chips de filtro por categoría y la rejilla de libros.
- **`book-detail-page`**: Vista de detalle que lee el parámetro de ruta `:id` automáticamente como señal (`input.required<string>()`) y renderiza la ficha extendida del libro.

---

## 3. ¿Por qué se hicieron estos cambios? (Justificación Técnica)

1. **Adopción del modelo Zoneless de Angular**:
   - *Por qué*: Tradicionalmente, Angular requería `zone.js` para interceptar eventos del navegador y disparar revisiones en cascada de todo el árbol. Con `provideZonelessChangeDetection()`, Angular reacciona únicamente cuando cambian las **Signals** que una vista específica está leyendo. Esto genera una aplicación más rápida, más ligera (~30 KB menos de bundle) y con tiempos de renderizado predecibles.

2. **Organización mediante Atomic Design**:
   - *Por qué*: Evita componentes gigantescos donde se mezcla HTML, estilos y llamadas a servicios. Al dividir la interfaz en átomos, moléculas, organismos, templates y páginas, los componentes base son 100% reutilizables, fáciles de probar y desacoplados del negocio.

3. **Signals nativas en lugar de RxJS verboso**:
   - *Por qué*: Para el manejo de estado en componentes visuales, `signal()`, `computed()` y `model()` eliminan la necesidad de lidiar con suscripciones manuales (`subscribe`), fugas de memoria o tuberías `async` en plantillas. El código es más legible y seguro.

4. **Binding de parámetros de ruta (`withComponentInputBinding`)**:
   - *Por qué*: Elimina la necesidad de inyectar `ActivatedRoute` y suscribirse a `params['id']`. El Router inyecta los parámetros de la URL directamente como un `input()` en el componente, simplificando el ciclo de vida.

5. **Nuevo Control Flow declarativo (`@if`, `@for`, `@empty`)**:
   - *Por qué*: Reemplaza directivas pesadas del CommonModule (`*ngIf`, `*ngFor`). Aporta chequeo estricto de tipos, exige un `track` explícito para optimizar el DOM y provee un bloque `@empty` nativo para cuando una lista está vacía.

---

## 4. ¿Cómo funciona la aplicación? (Flujo de Ejecución)

### 4.1 Ciclo de arranque
1. `main.ts` inicia la aplicación usando `appConfig` de `app.config.ts`.
2. Se activa el modo Zoneless y se configura el enrutador.
3. Se monta el componente raíz `App` (`app.ts` / `app.html`), el cual muestra `<router-outlet />`.
4. Según la URL, el Router resuelve la página (por defecto, `HomePageComponent`).

### 4.2 Flujo de Datos y Reactividad
La aplicación sigue un flujo unidireccional con una fuente única de verdad:

```
[Usuario interactúa]
        │
        ▼
[Componente emite Output o llama a Método de Servicio]
        │
        ▼
[LibraryService muta un Signal interno (ej: _borrowedBookIds)]
        │
        ▼
[Se recalculan automáticamente los Signals derivados (computed)]
  ├── totalLoansCount()
  ├── borrowedBooks()
  └── filteredBooks()
        │
        ▼
[Angular Zoneless detecta los Signals leídos y actualiza SOLO los nodos DOM correspondientes]
  ├── Contador del Header
  ├── Botón e indicador de la tarjeta (Card)
  ├── Lista interna del Drawer
  └── Mensaje emergente (Toast)
```

### 4.3 Ejemplo práctico: Prestar un libro
1. El usuario hace clic en el botón *"Prestar"* dentro de `BookCardComponent`.
2. La card emite un evento `output()` llamado `borrow`.
3. El componente padre o contenedor invoca `libraryService.borrowBook(book.id)`.
4. El servicio actualiza el Signal `_borrowedBookIds`.
5. Automáticamente y sin que intervenga `Zone.js`:
   - El `HeaderComponent` actualiza la insignia numérica de préstamos activos.
   - La tarjeta cambia su botón a *"Devolver"* y muestra el badge *"Prestado"*.
   - El `NotificationService` dispara un aviso: *"Libro añadido a tus préstamos"*, el cual se muestra en el `ToastComponent` y desaparece a los 3 segundos.

---

## 5. Resumen de Tecnologías y Versiones Usadas

- **Framework**: Angular 18/19+ (Standalone Components).
- **Change Detection**: Zoneless (`provideZonelessChangeDetection`).
- **Estado**: Angular Signals (`signal`, `computed`, `model`, `output`, `input`).
- **Diseño**: CSS / SCSS Modular con Custom Properties nativas.
- **Enrutamiento**: Angular Router con `withComponentInputBinding` y carga perezosa (`loadComponent`).
