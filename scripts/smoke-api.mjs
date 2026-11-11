#!/usr/bin/env node
/**
 * Script de verificación de contrato HTTP API ↔ Frontend (§13.1).
 * Requiere Node >= 22 (usa fetch nativo, cero dependencias externas).
 *
 * Uso:
 *   API_URL=http://localhost:10101/biblioteca/api/v1 node scripts/smoke-api.mjs
 */

const API_URL = (process.env.API_URL || 'http://localhost:10101/biblioteca/api/v1').replace(
  /\/+$/,
  ''
);

function assert(condicion, mensaje) {
  if (!condicion) {
    throw new Error(`[CONTRATO ROTO] ${mensaje}`);
  }
}

function formatearIsoLocal(fecha) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`
  );
}

function validarLibroCatalogo(libro, contexto) {
  assert(libro && typeof libro === 'object', `${contexto}: debe ser un objeto`);
  assert(typeof libro.idLibro === 'number', `${contexto}: idLibro debe ser number`);
  assert(typeof libro.isbn === 'string' && libro.isbn.length > 0, `${contexto}: isbn inválido`);
  assert(
    typeof libro.titulo === 'string' && libro.titulo.length > 0,
    `${contexto}: titulo inválido`
  );
  assert(typeof libro.idGenero === 'number', `${contexto}: idGenero debe ser number`);
  assert(typeof libro.nombreGenero === 'string', `${contexto}: nombreGenero debe ser string`);
  assert(Array.isArray(libro.autores), `${contexto}: autores debe ser Array`);
  for (const autor of libro.autores) {
    assert(typeof autor.idAutor === 'number', `${contexto}: autor.idAutor debe ser number`);
    assert(
      typeof autor.nombreAutor === 'string',
      `${contexto}: autor.nombreAutor debe ser string`
    );
  }
  assert(
    libro.anioPublicacion === null || typeof libro.anioPublicacion === 'number',
    `${contexto}: anioPublicacion debe ser number | null`
  );
  assert(
    typeof libro.totalEjemplares === 'number' && libro.totalEjemplares >= 0,
    `${contexto}: totalEjemplares debe ser number >= 0`
  );
  assert(
    typeof libro.ejemplaresDisponibles === 'number' && libro.ejemplaresDisponibles >= 0,
    `${contexto}: ejemplaresDisponibles debe ser number >= 0`
  );
}

function validarReserva(reserva, contexto) {
  assert(reserva && typeof reserva === 'object', `${contexto}: debe ser un objeto`);
  assert(typeof reserva.idReserva === 'number', `${contexto}: idReserva debe ser number`);
  assert(typeof reserva.idUsuario === 'number', `${contexto}: idUsuario debe ser number`);
  assert(typeof reserva.nombreUsuario === 'string', `${contexto}: nombreUsuario debe ser string`);
  assert(typeof reserva.idEjemplar === 'number', `${contexto}: idEjemplar debe ser number`);
  assert(typeof reserva.idLibro === 'number', `${contexto}: idLibro debe ser number`);
  assert(typeof reserva.tituloLibro === 'string', `${contexto}: tituloLibro debe ser string`);
  assert(
    typeof reserva.fechaSolicitud === 'string',
    `${contexto}: fechaSolicitud debe ser string ISO`
  );
  assert(
    typeof reserva.fechaInicio === 'string',
    `${contexto}: fechaInicio debe ser string ISO`
  );
  assert(
    typeof reserva.fechaEntrega === 'string',
    `${contexto}: fechaEntrega debe ser string ISO`
  );
  assert(
    ['ACTIVA', 'FINALIZADA', 'CANCELADA'].includes(reserva.estadoReserva),
    `${contexto}: estadoReserva inválido (${reserva.estadoReserva})`
  );
}

function validarErrorContrato(cuerpo, statusEsperado, contexto) {
  assert(cuerpo && typeof cuerpo === 'object', `${contexto}: cuerpo de error debe ser objeto`);
  assert(
    cuerpo.status === statusEsperado,
    `${contexto}: status en JSON (${cuerpo.status}) != ${statusEsperado}`
  );
  assert(typeof cuerpo.message === 'string', `${contexto}: message debe ser string`);
  assert(typeof cuerpo.timestamp === 'string', `${contexto}: timestamp debe ser string`);
}

async function main() {
  console.log(`=== Verificación de contrato API ↔ Front ===`);
  console.log(`API_URL: ${API_URL}\n`);

  const sufijo = Date.now().toString().slice(-8);
  const docUsuario = `1094${sufijo}`;
  const correoUsuario = `smoke.${sufijo}@biblioteca.com`;
  const passwordUsuario = 'SmokeTest2026*';
  const nombreUsuario = 'Usuario Prueba Contrato';

  // 1. POST /auth/register (intentando escalar rol a ADMIN -> debe forzar USUARIO)
  console.log('1. POST /auth/register (público + prevención de escalación de rol)...');
  const resReg = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentoIdentidad: docUsuario,
      nombreCompleto: nombreUsuario,
      correo: correoUsuario,
      password: passwordUsuario,
      rol: 'ADMIN'
    })
  });
  assert(resReg.status === 201, `Esperado HTTP 201 en /auth/register, recibido ${resReg.status}`);
  const bodyReg = await resReg.json();
  assert(typeof bodyReg.idUsuario === 'number', 'register: idUsuario debe ser number');
  assert(bodyReg.correo === correoUsuario, 'register: correo no coincide');
  assert(bodyReg.nombreCompleto === nombreUsuario, 'register: nombreCompleto no coincide');
  assert(
    bodyReg.rol === 'USUARIO',
    `register: rol debía forzarse a USUARIO, recibido ${bodyReg.rol}`
  );
  assert(bodyReg.estado === true, 'register: estado debe ser true');
  console.log('   ✔ OK (201 Created, rol=USUARIO forzado)');

  // 2. POST /auth/login
  console.log('2. POST /auth/login (obtención de JWT + nombreCompleto B-4)...');
  const resLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correo: correoUsuario,
      password: passwordUsuario
    })
  });
  assert(resLogin.status === 200, `Esperado HTTP 200 en /auth/login, recibido ${resLogin.status}`);
  const bodyLogin = await resLogin.json();
  assert(
    typeof bodyLogin.token === 'string' && bodyLogin.token.split('.').length === 3,
    'login: token debe ser un JWT de 3 segmentos'
  );
  assert(bodyLogin.tipoToken === 'Bearer', 'login: tipoToken debe ser Bearer');
  assert(
    typeof bodyLogin.expiraEnMs === 'number' && bodyLogin.expiraEnMs > 0,
    'login: expiraEnMs debe ser > 0'
  );
  assert(bodyLogin.correo === correoUsuario, 'login: correo no coincide');
  assert(bodyLogin.rol === 'USUARIO', 'login: rol debe ser USUARIO');
  assert(
    bodyLogin.nombreCompleto === nombreUsuario,
    `login: nombreCompleto esperado "${nombreUsuario}", recibido "${bodyLogin.nombreCompleto}"`
  );
  const token = bodyLogin.token;
  console.log('   ✔ OK (200 OK, JWT válido + nombreCompleto presente)');

  // 3. GET /catalogo (público, sin token)
  console.log('3. GET /catalogo (público, sin token)...');
  const resCat = await fetch(`${API_URL}/catalogo`);
  assert(resCat.status === 200, `Esperado HTTP 200 en /catalogo, recibido ${resCat.status}`);
  const catalogo = await resCat.json();
  assert(Array.isArray(catalogo) && catalogo.length > 0, '/catalogo debe devolver lista no vacía');
  for (const libro of catalogo) {
    validarLibroCatalogo(libro, `Libro id=${libro?.idLibro}`);
  }
  const libroConStock = catalogo.find((l) => l.ejemplaresDisponibles > 0) || catalogo[0];
  console.log(`   ✔ OK (200 OK, ${catalogo.length} libros validados contra LibroCatalogo)`);

  // 4. GET /catalogo/{id} (público, sin token) + 404
  console.log(`4. GET /catalogo/${libroConStock.idLibro} y /catalogo/999999...`);
  const resDet = await fetch(`${API_URL}/catalogo/${libroConStock.idLibro}`);
  assert(resDet.status === 200, `Esperado HTTP 200 en /catalogo/{id}, recibido ${resDet.status}`);
  const detalle = await resDet.json();
  validarLibroCatalogo(detalle, 'Detalle /catalogo/{id}');
  assert(detalle.idLibro === libroConStock.idLibro, 'Detalle idLibro no coincide');

  const resDet404 = await fetch(`${API_URL}/catalogo/999999`);
  assert(resDet404.status === 404, `Esperado HTTP 404 en /catalogo/999999, recibido ${resDet404.status}`);
  console.log('   ✔ OK (200 OK + 404 Not Found verificado)');

  // 5. GET /libros/{id}/disponibilidad?fechaHora=...
  const fechaInicioDate = new Date(Date.now() + 72 * 3600 * 1000);
  const fechaEntregaDate = new Date(fechaInicioDate.getTime() + 5 * 24 * 3600 * 1000);
  const fechaInicioIso = formatearIsoLocal(fechaInicioDate);
  const fechaEntregaIso = formatearIsoLocal(fechaEntregaDate);

  console.log(`5. GET /libros/${libroConStock.idLibro}/disponibilidad?fechaHora=${fechaInicioIso}...`);
  const resDisp = await fetch(
    `${API_URL}/libros/${libroConStock.idLibro}/disponibilidad?fechaHora=${encodeURIComponent(fechaInicioIso)}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  assert(
    resDisp.status === 200,
    `Esperado HTTP 200 en /disponibilidad, recibido ${resDisp.status}`
  );
  const disp = await resDisp.json();
  assert(disp.idLibro === libroConStock.idLibro, 'disponibilidad: idLibro no coincide');
  assert(typeof disp.disponible === 'boolean', 'disponibilidad: disponible debe ser boolean');
  assert(
    typeof disp.ejemplaresDisponibles === 'number',
    'disponibilidad: ejemplaresDisponibles debe ser number'
  );
  console.log(`   ✔ OK (200 OK, disponible=${disp.disponible}, stock=${disp.ejemplaresDisponibles})`);

  // 6. POST /reservas
  console.log('6. POST /reservas (crear préstamo activo)...');
  const resCrear = await fetch(`${API_URL}/reservas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      idLibro: libroConStock.idLibro,
      fechaInicio: fechaInicioIso,
      fechaEntrega: fechaEntregaIso
    })
  });
  assert(resCrear.status === 201, `Esperado HTTP 201 en POST /reservas, recibido ${resCrear.status}`);
  const reservaCreada = await resCrear.json();
  validarReserva(reservaCreada, 'POST /reservas');
  assert(reservaCreada.estadoReserva === 'ACTIVA', 'Reserva creada debe estar ACTIVA');
  console.log(`   ✔ OK (201 Created, idReserva=${reservaCreada.idReserva})`);

  // 7. GET /reservas/mis-reservas
  console.log('7. GET /reservas/mis-reservas...');
  const resMis = await fetch(`${API_URL}/reservas/mis-reservas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(resMis.status === 200, `Esperado HTTP 200 en /mis-reservas, recibido ${resMis.status}`);
  const misReservas = await resMis.json();
  assert(Array.isArray(misReservas) && misReservas.length >= 1, 'mis-reservas debe incluir la reserva');
  const encontrada = misReservas.find((r) => r.idReserva === reservaCreada.idReserva);
  assert(Boolean(encontrada), 'mis-reservas no contiene la reserva recién creada');
  validarReserva(encontrada, 'GET /reservas/mis-reservas item');
  console.log('   ✔ OK (200 OK, reserva encontrada en mis-reservas)');

  // 8. PATCH /reservas/{id}/cancelar
  console.log(`8. PATCH /reservas/${reservaCreada.idReserva}/cancelar...`);
  const resCancel = await fetch(`${API_URL}/reservas/${reservaCreada.idReserva}/cancelar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(
    resCancel.status === 200,
    `Esperado HTTP 200 al cancelar reserva, recibido ${resCancel.status}`
  );
  const reservaCancelada = await resCancel.json();
  validarReserva(reservaCancelada, 'PATCH /reservas/{id}/cancelar');
  assert(
    reservaCancelada.estadoReserva === 'CANCELADA',
    `Esperado estado CANCELADA, recibido ${reservaCancelada.estadoReserva}`
  );
  console.log('   ✔ OK (200 OK, estadoReserva=CANCELADA)');

  // 9. Ruta ADMIN con token USUARIO -> 403
  console.log('9. GET /libros/1 y GET /usuarios con token USUARIO (esperado 403 Forbidden)...');
  const res403Libro = await fetch(`${API_URL}/libros/${libroConStock.idLibro}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(
    res403Libro.status === 403,
    `Esperado HTTP 403 en GET /libros/{id} con rol USUARIO, recibido ${res403Libro.status}`
  );
  validarErrorContrato(await res403Libro.json(), 403, 'GET /libros/{id} como USUARIO');

  const res403Usuarios = await fetch(`${API_URL}/usuarios`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(
    res403Usuarios.status === 403,
    `Esperado HTTP 403 en GET /usuarios con rol USUARIO, recibido ${res403Usuarios.status}`
  );
  validarErrorContrato(await res403Usuarios.json(), 403, 'GET /usuarios como USUARIO');
  console.log('   ✔ OK (403 Forbidden verificado en endpoints exclusivos ADMIN)');

  // 10. Token inválido -> 401
  console.log('10. GET /generos con token inválido/manipulado (esperado 401 Unauthorized)...');
  const res401 = await fetch(`${API_URL}/generos`, {
    headers: { Authorization: 'Bearer token.invalido.manipulado' }
  });
  assert(res401.status === 401, `Esperado HTTP 401 con token inválido, recibido ${res401.status}`);
  validarErrorContrato(await res401.json(), 401, 'GET /generos con token inválido');
  console.log('   ✔ OK (401 Unauthorized verificado)');

  // 11. Preflight CORS OPTIONS desde http://localhost:4200
  console.log('11. OPTIONS /catalogo preflight CORS (Origin: http://localhost:4200)...');
  const resCors = await fetch(`${API_URL}/catalogo`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:4200',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization,Content-Type'
    }
  });
  assert(resCors.status === 200, `Esperado HTTP 200 en preflight CORS, recibido ${resCors.status}`);
  const allowOrigin = resCors.headers.get('access-control-allow-origin');
  assert(
    allowOrigin === 'http://localhost:4200',
    `Esperado Access-Control-Allow-Origin=http://localhost:4200, recibido ${allowOrigin}`
  );
  console.log('   ✔ OK (CORS Access-Control-Allow-Origin: http://localhost:4200)');

  console.log('\n✅ TODOS LOS CHEQUEOS DE CONTRATO API ↔ FRONT PASARON EXITOSAMENTE.');
}

main().catch((err) => {
  console.error('\n❌ FALLÓ LA VERIFICACIÓN DE CONTRATO:', err.message);
  process.exit(1);
});
