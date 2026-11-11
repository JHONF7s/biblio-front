import { expect, test } from '@playwright/test';
import * as path from 'node:path';

const EVIDENCIAS_DIR = '/home/victorsheen/biblioteca-integracion/evidencias/frontend';

test.describe('Suite E2E Integral · Biblioteca Full-Stack (§13.3 y §13.5)', () => {
  test('Flujo 1 y 13.5: Visitante anónimo ve Home y Catálogo con datos reales + capturas claro/oscuro (ref-2, ref-3, ref-5)', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Esperar a que carguen las tarjetas reales desde GET /catalogo
    await expect(page.locator('app-book-card').first()).toBeVisible({ timeout: 15_000 });
    const totalCardsHome = await page.locator('app-book-card').count();
    expect(totalCardsHome).toBeGreaterThan(0);

    // Verificar medición de márgenes laterales a 1440 px <= 40 px (R10 / ref-2)
    const contenedorBox = await page.locator('.site-header__inner').boundingBox();
    expect(contenedorBox).not.toBeNull();
    expect(contenedorBox!.x).toBeLessThanOrEqual(40);

    // Brand deshabilitado en "/" (R4)
    const brandLink = page.locator('app-header app-brand a');
    await expect(brandLink).toHaveAttribute('aria-disabled', 'true');

    // Captura Home Claro 1440px y Header (ref-3)
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'home-light-1440.png'),
      fullPage: true
    });
    await page.locator('app-header').screenshot({
      path: path.join(EVIDENCIAS_DIR, 'ref3-header-1440.png')
    });

    // Captura Footer (ref-5)
    const footer = page.locator('app-site-footer');
    await expect(footer).toBeVisible();
    await footer.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'ref5-footer-1440.png')
    });
  });

  test('Flujo 2 (S-F1): /loans sin sesión redirige a /login?returnUrl=/loans y /home muestra 404', async ({
    page
  }) => {
    await page.goto('/loans');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Floans/);

    await page.goto('/home');
    await expect(page.locator('h1')).toContainText('Esta página no existe en el catálogo');
  });

  test('Flujo 3 y 4: Login incorrecto (mensaje genérico) y Registro -> Login automático', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');

    // Captura Login en claro
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'login-light-1440.png')
    });

    // Flujo 4: Login incorrecto
    await page.fill('#login-correo', 'usuario.inexistente@biblioteca.com');
    await page.fill('#login-password', 'ClaveIncorrecta999*');
    await page.click('[data-testid="login-form"] button[type="submit"]');
    await expect(page.locator('[data-testid="auth-error-banner"]')).toContainText(
      'Correo o contraseña incorrectos.'
    );

    // Flujo 3: Cambiar a Registro y crear usuario nuevo
    await page.click('[data-testid="tab-registro"]');
    await expect(page).toHaveURL(/modo=registro/);

    const sufijo = Date.now().toString().slice(-7);
    const correoNuevo = `e2e.${sufijo}@biblioteca.com`;
    await page.fill('#reg-documento', `1095${sufijo}`);
    await page.fill('#reg-nombre', 'Valentina Quintero E2E');
    await page.fill('#reg-correo', correoNuevo);
    await page.fill('#reg-password', 'Lectura2026*');
    await page.fill('#reg-confirmar', 'Lectura2026*');
    await page.click('[data-testid="register-form"] button[type="submit"]');

    // Debe redirigir a "/" autenticado y mostrar el nombre en el header
    await expect(page).toHaveURL('http://localhost:4200/');
    await expect(page.locator('.site-header__user-name')).toContainText('Valentina Quintero E2E');
  });

  test('Flujo 5 y 6: Catálogo con filtros, búsqueda difusa, URL compartible y Favoritos', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/catalog?q=garcia');

    await expect(page.locator('app-book-card').first()).toBeVisible();
    await expect(page.locator('app-book-card').first()).toContainText('Cien Años de Soledad');

    // Captura Catálogo Claro 1440px
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'catalog-light-1440.png'),
      fullPage: false
    });

    // Flujo 6: Marcar favorito y activar filtro Solo favoritos
    const btnFav = page.locator('app-book-card').first().locator('.book-card__fav-btn');
    await btnFav.click();
    await expect(btnFav).toHaveAttribute('aria-pressed', 'true');

    await page.locator('.toggle-row input[type="checkbox"]').first().check();
    await expect(page).toHaveURL(/fav=1/);
    const conteoFav = await page.locator('app-book-card').count();
    expect(conteoFav).toBe(1);
  });

  test('Flujo 7 y 8: Pedir prestado -> Panel lateral (ref-4) -> Expandir a /loans -> Cancelar reserva', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login?modo=registro');

    const sufijo = Date.now().toString().slice(-7);
    await page.fill('#reg-documento', `1098${sufijo}`);
    await page.fill('#reg-nombre', 'Mateo Préstamos E2E');
    await page.fill('#reg-correo', `prestamo.${sufijo}@biblioteca.com`);
    await page.fill('#reg-password', 'Lectura2026*');
    await page.fill('#reg-confirmar', 'Lectura2026*');
    await page.click('[data-testid="register-form"] button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:4200/');

    // Ir al catálogo y pedir prestado el primer libro disponible
    await page.goto('/catalog?disp=1');
    await expect(page.locator('app-book-card').first()).toBeVisible();
    await page
      .locator('app-book-card')
      .first()
      .getByRole('button', { name: 'Pedir prestado' })
      .click();

    // Se abre el diálogo de reserva (F-34)
    const dialog = page.locator('.reserva-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirmar préstamo' }).click();

    // Tras confirmar, se abre automáticamente el panel lateral "Mis Préstamos" (ref-4)
    const drawer = page.locator('[data-testid="loan-drawer-panel"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.loan-item').first()).toBeVisible();

    // Captura del panel lateral superpuesto con fondo difuminado (ref-4)
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'ref4-drawer-prestamos-1440.png')
    });

    // Flujo 8: Clic en "Expandir" -> transición a /loans termina sin errores y cierra el drawer
    await drawer.locator('[data-testid="loan-drawer-expand-btn"]').click();
    await expect(page).toHaveURL(/\/loans$/, { timeout: 10_000 });
    await expect(page.locator('#loans-page-title')).toBeVisible();

    // Captura de /loans en claro
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'loans-light-1440.png')
    });

    // Flujo 7 (continuación): Cancelar el préstamo activo desde /loans
    await page.locator('.loans-table__cancel-btn').first().click();
    await page
      .locator('.loans-confirm-dialog')
      .getByRole('button', { name: 'Confirmar cancelación' })
      .click();

    // Verificar que pasa a la pestaña Canceladas
    await page.getByRole('tab', { name: /Canceladas/i }).click();
    await expect(page.locator('tr[data-loan-row-id]').first()).toBeVisible();
  });

  test('Flujo 9 (ref-1): Cambio de tema tri-estado, persistencia tras recargar y capturas en modo oscuro', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('biblio.theme'));
    await page.reload();

    const toggleBtn = page.locator('app-theme-toggle button');
    await expect(toggleBtn).toHaveAttribute('data-theme-state', 'neutral');

    // Clic 1: pasa a oscuro (--dy: -32px)
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('data-theme-state', 'dark');
    const tieneDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains('dark-theme')
    );
    expect(tieneDarkClass).toBe(true);

    // Captura Home Oscuro 1440px y botón de tema (ref-1)
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'home-dark-1440.png'),
      fullPage: true
    });
    await toggleBtn.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'ref1-theme-toggle-dark.png')
    });

    // Recargar y verificar que persiste en oscuro sin perder el estado
    await page.reload();
    await expect(toggleBtn).toHaveAttribute('data-theme-state', 'dark');

    // Clic 2: pasa a claro explícito (--dy: +31px)
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('data-theme-state', 'light');
    await toggleBtn.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'ref1-theme-toggle-light.png')
    });
  });

  test('Flujo 10 y 11: Sincronización de cierre de sesión entre pestañas y rechazo de token manipulado', async ({
    context
  }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/login');
    await page1.fill('#login-correo', 'usuario@biblioteca.com');
    await page1.fill('#login-password', 'Usuario123*');
    await page1.click('[data-testid="login-form"] button[type="submit"]');
    await expect(page1).toHaveURL('http://localhost:4200/');

    await page2.goto('/loans');
    await expect(page2.locator('#loans-page-title')).toBeVisible();

    // Flujo 10: Cerrar sesión en page1 actualiza page2 vía StorageEvent
    await page1.locator('[data-testid="header-user-trigger"]').click();
    await page1.locator('[data-testid="header-logout-btn"]').click();

    await expect(page2.locator('app-header')).toContainText('Iniciar sesión');

    // Flujo 11: Inyectar un token manipulado en localStorage e intentar abrir /loans
    await page1.evaluate(() => {
      localStorage.setItem(
        'biblio.session',
        JSON.stringify({
          token: 'token.manipulado.invalido',
          correo: 'hacker@evil.com',
          rol: 'ADMIN',
          nombreCompleto: 'Hacker',
          exp: Date.now() + 999999
        })
      );
    });
    await page1.goto('/loans');
    await expect(page1).toHaveURL(/\/login\?returnUrl=%2Floans/);
  });

  test('Flujo 12 (S-F6): Prevención de XSS cuando el título de un libro contiene etiquetas HTML/script', async ({
    page
  }) => {
    let alertaDisparada = false;
    page.on('dialog', () => {
      alertaDisparada = true;
    });

    await page.route('**/api/v1/catalogo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            idLibro: 999,
            isbn: '978-0000000999',
            titulo: '<img src=x onerror=alert(1)> Libro Seguro',
            idGenero: 1,
            nombreGenero: 'Seguridad',
            autores: [{ idAutor: 1, nombreAutor: 'Autor XSS' }],
            anioPublicacion: 2026,
            totalEjemplares: 2,
            ejemplaresDisponibles: 2
          }
        ])
      });
    });

    await page.goto('/catalog');
    const cardTitle = page.locator('app-book-card .book-card__title').first();
    await expect(cardTitle).toContainText('<img src=x onerror=alert(1)> Libro Seguro');
    const imgInyectada = await cardTitle.locator('img').count();
    expect(imgInyectada).toBe(0);
    expect(alertaDisparada).toBe(false);
  });

  test('Flujo 13 (§11): Verificación de 8 viewports (360..2560 px) sin desborde horizontal + capturas', async ({
    page
  }) => {
    const anchos = [360, 390, 768, 1024, 1280, 1440, 1920, 2560];
    await page.goto('/catalog');
    await expect(page.locator('app-book-card').first()).toBeVisible();

    for (const width of anchos) {
      const height = width < 768 ? 844 : 900;
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);

      const sinDesborde = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      );
      expect(sinDesborde, `Desborde horizontal detectado a ${width}px`).toBe(true);

      await page.screenshot({
        path: path.join(EVIDENCIAS_DIR, `viewport-${width}px.png`),
        fullPage: false
      });
    }

    // También capturar 390px en modo oscuro (§13.5)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('app-theme-toggle button').click();
    await page.screenshot({
      path: path.join(EVIDENCIAS_DIR, 'catalog-dark-390.png'),
      fullPage: false
    });
  });
});
