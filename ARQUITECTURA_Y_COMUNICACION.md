# Arquitectura Técnica y Patrones de Comunicación en Angular Zoneless con Atomic Design

Este documento detalla exhaustivamente los fundamentos arquitectónicos, la estructura de componentes basada en **Atomic Design**, el nuevo motor de reactividad sin Zone.js (**Zoneless Change Detection**) y las 6 estrategias clave de comunicación entre componentes implementadas en **BiblioAngular**.

---

## 1. Fundamentos del Stack Tecnológico

### 1.1 Angular Zoneless (`provideZonelessChangeDetection`)
Históricamente, Angular dependía de `Zone.js`, una librería que sobreescribe (monkey-patch) las APIs asíncronas del navegador (`setTimeout`, `Promise`, `addEventListener`, etc.) para notificar al framework cuándo debía ejecutar la detección de cambios global de arriba a abajo en todo el árbol de componentes.

En este proyecto, se utiliza la arquitectura **Zoneless**:
- **Configuración**: Activo en [`app.config.ts`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/app.config.ts) mediante `provideZonelessChangeDetection()`.
- **Mecanismo de Reconciliación**: Angular ya no intercepta las APIs del navegador ni recorre ciegamente el árbol. En su lugar, el framework es notificado quirúrgicamente mediante el grafo de **Signals** (Señales reactivas) cuando una señal es leída o mutada dentro de una vista.
- **Beneficios**:
  - Eliminación del bundle de `zone.js` (~30-40 KB en bruto).
  - Rendimiento predecible y tiempos de ejecución de Change Detection drásticamente reducidos (O(subárbol afectado) en vez de O(árbol total)).
  - Compatibilidad nativa con async/await estándar sin trampas de zona.

```typescript
// src/app/app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding())
  ]
};
```

---

## 2. Arquitectura Atomic Design

La estructura del código dentro de `src/app/` sigue rigurosamente el paradigma de diseño atómico para maximizar la reusabilidad, desacoplamiento y escalabilidad:

```
src/app/
├── core/                              # Capa de Dominio y Estado
│   ├── models/
│   │   └── book.model.ts              # Tipos de datos e interfaces
│   └── services/
│       ├── library.service.ts         # Reactive Store centralizado con Signals
│       └── notification.service.ts    # Servicio de alertas / toasts reactivo
│
└── ui/                                # Jerarquía Atomic Design
    ├── atoms/                         # Elementos indivisibles (puros, sin lógica de negocio)
    │   ├── badge/                     # Tags de categorías y estados
    │   ├── button/                    # Botón reutilizable con variantes y sizes
    │   └── input/                     # Campo de texto desacoplado con two-way binding
    │
    ├── molecules/                     # Combinaciones funcionales de átomos
    │   ├── search-bar/                # input + button combinados
    │   ├── book-card/                 # badge + button + ficha visual de libro
    │   ├── stat-chip/                 # Indicador de métricas clave
    │   └── toast/                     # Banner flotante reactivo a notificaciones
    │
    ├── organisms/                     # Secciones completas de interfaz
    │   ├── header/                    # Barra superior, navegación y contador reactivo
    │   ├── book-grid/                 # Rejilla reactiva con control flow @for y @empty
    │   └── loan-drawer/               # Panel lateral de préstamos activos
    │
    ├── templates/                     # Estructura espacial y layouts reutilizables
    │   └── main-layout/               # Esqueleto con slots (<ng-content>)
    │
    └── pages/                         # Vistas conectadas a rutas y controladores
        ├── home-page/                 # Catálogo, filtros y orquestación
        └── book-detail-page/          # Vista de detalle con parámetro de ruta reactivo
```

### 2.1 Desglose por capas

| Capa | Responsabilidad | Dependencias permitidas |
| :--- | :--- | :--- |
| **Atoms** | Renderizado puro de UI básica, estilización atómica. | Ninguna dependencia de negocio ni otros átomos. |
| **Molecules** | Unión de 2 o más átomos para crear un componente con propósito concreto. | Átomos. |
| **Organisms** | Agrupación de moléculas y átomos que forman bloques complejos de una página. | Átomos, Moléculas, Servicios globales si aplica. |
| **Templates** | Definición de layouts, distribución espacial y slots de proyección. | Organismos, Moléculas, Átomos (`<ng-content>`). |
| **Pages** | Controladores de vista enlazados a rutas, coordinan llamadas y estado. | Templates, Organismos, Moléculas, Servicios, Router. |

---

## 3. Patrones de Comunicación entre Componentes

Este proyecto implementa y demuestra las **6 vías esenciales de comunicación en Angular moderno**:

### 3.1 Padre a Hijo: Signal Inputs (`input()` y `input.required()`)
Reemplaza el decorador tradicional `@Input()`. Devuelve un objeto reactivo `Signal<T>`.

- **Ejemplo**: [`BadgeComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/atoms/badge/badge.component.ts)
```typescript
export class BadgeComponent {
  // Entrada obligatoria validada en tiempo de compilación
  readonly text = input.required<string>();
  // Entrada opcional con valor predeterminado
  readonly variant = input<BadgeVariant>('neutral');
  readonly pill = input<boolean>(false);
}
```
*Uso por el padre:*
```html
<app-badge [text]="book().category" variant="primary" [pill]="true" />
```

---

### 3.2 Hijo a Padre: Signal Outputs (`output()`)
Reemplaza a `@Output() = new EventEmitter()`. Es más ligero, type-safe y no arrastra RxJS innecesario cuando no se requiere.

- **Ejemplo**: [`ButtonComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/atoms/button/button.component.ts)
```typescript
export class ButtonComponent {
  readonly clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
```
*Captura por el padre:*
```html
<app-button variant="primary" (clicked)="onSearchSubmit()">
  Buscar
</app-button>
```

---

### 3.3 Comunicación Bidireccional: Model Signals (`model()`)
Sustituye el patrón verboso `@Input() value` + `@Output() valueChange`. `model()` crea un Signal mutable que sincroniza el estado entre padre e hijo mediante la sintaxis tipo "banana in a box" `[(value)]="state"`.

- **Ejemplo**: [`InputComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/atoms/input/input.component.ts)
```typescript
export class InputComponent {
  // Two-way binding automático
  readonly value = model<string>('');

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value); // Notifica al padre automáticamente
  }
}
```
*Consumo en la molécula [`SearchBarComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/molecules/search-bar/search-bar.component.ts):*
```html
<app-input
  [placeholder]="placeholder()"
  [value]="currentTerm()"
  (valueChange)="onTermChange($event)"
/>
```

---

### 3.4 Comunicación Global / Entre Hermanos: Reactive Store con Signals
Para compartir estado transversal (por ejemplo: el número de préstamos activos visible en el Header, en la Card del libro y en el Drawer lateral), se implementa un **Service Store** singleton (`providedIn: 'root'`) basado puramente en Signals.

- **Fichero**: [`LibraryService`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/core/services/library.service.ts)

```typescript
@Injectable({ providedIn: 'root' })
export class LibraryService {
  // Estado privado y mutable
  private readonly _borrowedBookIds = signal<string[]>([]);
  private readonly _books = signal<Book[]>(INITIAL_BOOKS);

  // Exposición pública de sólo lectura (Encapsulación segura)
  readonly borrowedBookIds = this._borrowedBookIds.asReadonly();

  // Señal calculada (memorizada automáticamente y reactiva)
  readonly totalLoansCount = computed(() => this._borrowedBookIds().length);

  readonly borrowedBooks = computed(() => {
    const ids = new Set(this._borrowedBookIds());
    return this._books().filter(b => ids.has(b.id));
  });

  // Mutaciones atómicas
  borrowBook(bookId: string): boolean {
    this._borrowedBookIds.update(ids => [...ids, bookId]);
    return true;
  }
}
```

*Consumo en [`HeaderComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/organisms/header/header.component.ts):*
```typescript
export class HeaderComponent {
  private readonly libraryService = inject(LibraryService);
  // Se enlaza directamente sin suscripciones manuales ni async pipe
  readonly loansCount = this.libraryService.totalLoansCount;
}
```
En el template:
```html
<span class="badge">{{ loansCount() }}</span>
```
Al ejecutar `borrowBook()`, el `computed` recalcula el valor y Angular actualiza exactamente el nodo DOM del contador sin re-renderizar componentes ajenos.

---

### 3.5 Proyección de Contenido (`<ng-content />`)
Permite a componentes contenedores (como Botones o Layouts) recibir fragmentos de plantilla arbitrarios desde sus consumidores sin acoplarse a su markup.

- **Fichero**: [`MainLayoutComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/templates/main-layout/main-layout.component.ts)
```html
<div class="layout">
  <app-header />
  <main class="layout__main">
    <ng-content /> <!-- El contenido de cada página se proyecta aquí -->
  </main>
  <app-loan-drawer />
  <app-toast />
  <footer>...</footer>
</div>
```

---

### 3.6 Parámetros de Ruta como Signal Inputs (`withComponentInputBinding`)
En [`app.config.ts`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/app.config.ts) se activa `withComponentInputBinding()`. Esto permite que cualquier parámetro de ruta definido en [`app.routes.ts`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/app.routes.ts) (`book/:id`) se inyecte automáticamente como un Signal Input en el componente de página, sin necesidad de inyectar `ActivatedRoute` ni suscribirse a `paramMap`.

- **Fichero**: [`BookDetailPageComponent`](file:///home/jhnf/pro/Apps/front/biblio-angular/src/app/ui/pages/book-detail-page/book-detail-page.component.ts)
```typescript
export class BookDetailPageComponent {
  private readonly libraryService = inject(LibraryService);

  // Parámetro :id de la URL inyectado directamente como señal
  readonly id = input.required<string>();

  // Computación derivada que reacciona de inmediato si el ID cambia
  readonly book = computed(() => this.libraryService.getBookById(this.id()));
}
```

---

## 4. Nuevo Flujo de Control Nativo (`Control Flow`)

Se eliminaron por completo las directivas estructurales obsoletas (`*ngIf`, `*ngFor`, `*ngSwitch`) en favor de la sintaxis declarativa nativa:

1. **`@if / @else`**: Evaluación directa sin instanciar directivas intermedias:
   ```html
   @if (isBorrowed()) {
     <app-button variant="danger" (clicked)="onReturn()">Devolver</app-button>
   } @else {
     <app-button variant="primary" (clicked)="onBorrow()">Prestar</app-button>
   }
   ```
2. **`@for` con `track` y `@empty`**:
   - `track book.id`: Obligatorio por el compilador para maximizar la reutilización del DOM durante ordenaciones y mutaciones.
   - `@empty`: Renderiza un fallback automático cuando el arreglo está vacío, eliminando verificaciones redundantes de `.length === 0`.
   ```html
   @for (book of books(); track book.id) {
     <app-book-card [book]="book" />
   } @empty {
     <div class="empty-state">No se encontraron libros</div>
   }
   ```

---

## 5. Diagrama de Flujo de Datos

```
+-------------------------------------------------------------------------+
|                              LibraryService                             |
|  [State: _books, _borrowedBookIds, _searchQuery, _selectedCategory]    |
|  [Computed: filteredBooks, borrowedBooks, totalLoansCount]              |
+--------------------+-------------------------------+--------------------+
                     | Reads Signals                 | Reads Signals
                     v                               v
        +-------------------------+     +-------------------------+
        |    HomePageComponent    |     |     HeaderComponent     |
        +------------+------------+     +------------+------------+
                     | Passes Input                  |
                     v                               |
        +-------------------------+                  |
        |    BookGridComponent    |                  |
        +------------+------------+                  |
                     | Passes Input                  |
                     v                               |
        +-------------------------+                  |
        |    BookCardComponent    |                  |
        +------------+------------+                  |
                     | User Clicks [Prestar]         |
                     | (Emits Output)                |
                     v                               |
        +-------------------------+                  |
        | LibraryService.borrow() |                  |
        +------------+------------+                  |
                     | Updates Signal                |
                     +-------------------------------+
                     | (Reactive zoneless update to Header counter,
                     |  Card status, and LoanDrawer list)
```

---

## 6. Guía Rápida para el Desarrollador

1. **Crear un nuevo Átomo**:
   - Debe ser Standalone (`standalone: true` por defecto).
   - Sólo recibe `input()` / emite `output()`.
   - No inyecta servicios de negocio.

2. **Crear una nueva Molécula**:
   - Combina dos o más átomos.
   - Si requiere estado transitorio de UI (ej. abrir un dropdown), usa señales locales (`signal()`).

3. **Modificar el Estado**:
   - Nunca mutar un objeto directamente en un signal.
   - Usar `.update((prev) => [...prev, newItem])` o `.set(newValue)`.

4. **Ejecutar el Servidor de Desarrollo**:
   ```bash
   npm start
   ```
   La aplicación se sirve en `http://localhost:4200/`.
