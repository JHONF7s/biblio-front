# Registro de Cambios y Funcionamiento del Rediseño Full-Stack

Este documento resume las mejoras estructurales, visuales, funcionales y de seguridad implementadas en **BiblioTech Frontend** para su integración con el backend **Spring Boot (`biblioteca-farsheen`)**.

---

## 1. Resumen de la Transformación

1. **Reestructuración sin pérdida de historial (`core / shared / features`)**:
   - Los átomos, moléculas, organismos y plantillas existentes se reubicaron mediante `git mv` dentro de `src/app/shared/ui/`.
   - Las páginas se organizaron por dominio en `src/app/features/{home,auth,catalog,loans,not-found}`.
   - Se eliminaron los datos simulados (`library.service.ts`, `book.model.ts` con calificaciones ficticias y conteos de páginas inexistentes en el backend) y las credenciales de prueba quemadas en el cliente.

2. **Integración Real con el Contrato HTTP (`http://localhost:10101/biblioteca/api/v1`)**:
   - **`CatalogoService`**: consume los endpoints públicos `GET /catalogo` y `GET /catalogo/{id}`, calculando en tiempo real el total de títulos, copias disponibles, géneros con conteo, autores con conteo y rango de años de publicación.
   - **`AuthService`**: conecta los formularios reactivos de `/login` y `/login?modo=registro` con `POST /auth/login` y `POST /auth/register`.
   - **`ReservasService`**: consulta disponibilidad por fecha/hora (`GET /libros/{id}/disponibilidad?fechaHora=`), crea reservas (`POST /reservas`), lista préstamos del usuario (`GET /reservas/mis-reservas`) y cancela reservas activas (`PATCH /reservas/{id}/cancelar`) validando la regla de negocio de más de 24 horas de anticipación.
   - **`FavoritosService`**: persiste favoritos en `localStorage` bajo `biblio.favoritos.anon` para visitantes y los fusiona automáticamente en `biblio.favoritos.<correo>` al iniciar sesión.

3. **Rediseño Visual y Experiencia de Usuario**:
   - **Aprovechamiento del ancho**: contenedor `.page-container` de hasta `2200px` con márgenes laterales fluidos `clamp(16px, 2.5vw, 40px)`.
   - **Tokens y geometría**: acento primario morado (`#6746e5` en claro / `#9a8cf9` para texto en oscuro con contraste WCAG AA) y radios moderados estilo Apple HIG (`4px` a `16px`).
   - **Header global 50/50**: marca institucional (`BrandComponent`, deshabilitada en `/`), buscador central con acceso directo a «Búsqueda avanzada» y navegación contextual según estado de sesión.
   - **Catálogo con sidebar desplegable y búsqueda difusa**: filtrado combinable por texto libre (tolerante a tildes y errores tipográficos con distancia de Damerau-Levenshtein), disponibilidad inmediata, favoritos, género, autor, rango de años y ordenamiento, sincronizado bidireccionalmente con los *query params* de la URL.
   - **Panel lateral «Mis Préstamos» y página `/loans`**: superposición con fondo difuminado (`backdrop-filter: blur(8px)`), animación fluida de derecha a izquierda al pulsar «Expandir» hacia `/loans` y diálogo modal accesible para solicitar préstamos.
   - **Footer institucional de 4 columnas**: fondo azul marino oscuro en ambos temas con enlaces funcionales, recomendaciones reales del catálogo, canales de contacto y botón «Afíliate» (visible solo para visitantes no autenticados).
