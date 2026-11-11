import { LibroCatalogo } from '../models/libro.model';

export interface ResultadoBusquedaDifusa {
  readonly libro: LibroCatalogo;
  readonly puntaje: number;
}

const PESO_TITULO = 3;
const PESO_ISBN = 3;
const PESO_AUTOR = 2;
const PESO_GENERO = 1;

/**
 * Normaliza un texto pasando a minúsculas, eliminando diacríticos (tildes/diéresis)
 * mediante NFD y reemplazando puntuación por espacios simples.
 */
export function normalizarTextoBusqueda(texto: string): string {
  if (!texto) {
    return '';
  }
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarIsbn(isbn: string): string {
  if (!isbn) {
    return '';
  }
  return isbn.replace(/[^0-9xX]/g, '').toLowerCase();
}

export function tokenizarBusqueda(textoNormalizado: string): string[] {
  if (!textoNormalizado) {
    return [];
  }
  return textoNormalizado
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Distancia de Damerau-Levenshtein restringida (Optimal String Alignment) con cota máxima.
 * Permite inserción, eliminación, sustitución y transposición de caracteres adyacentes.
 */
export function distanciaDamerauLevenshtein(a: string, b: string, maxDist = 2): number {
  if (a === b) {
    return 0;
  }
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) {
    return maxDist + 1;
  }
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  let prevPrevRow = new Int32Array(lenB + 1);
  let prevRow = new Int32Array(lenB + 1);
  let currRow = new Int32Array(lenB + 1);

  for (let j = 0; j <= lenB; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    currRow[0] = i;
    let minInRow = currRow[0];
    const charA = a.charCodeAt(i - 1);

    for (let j = 1; j <= lenB; j++) {
      const charB = b.charCodeAt(j - 1);
      const cost = charA === charB ? 0 : 1;

      let val = Math.min(
        prevRow[j] + 1, // eliminación
        currRow[j - 1] + 1, // inserción
        prevRow[j - 1] + cost // sustitución
      );

      if (
        i > 1 &&
        j > 1 &&
        charA === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === charB
      ) {
        val = Math.min(val, prevPrevRow[j - 2] + 1); // transposición
      }

      currRow[j] = val;
      if (val < minInRow) {
        minInRow = val;
      }
    }

    if (minInRow > maxDist) {
      return maxDist + 1;
    }

    const tmp = prevPrevRow;
    prevPrevRow = prevRow;
    prevRow = currRow;
    currRow = tmp;
  }

  return prevRow[lenB];
}

function puntuarTokenContraCampo(
  tokenQuery: string,
  textoCampo: string,
  tokensCampo: readonly string[],
  peso: number
): number {
  if (!textoCampo || tokensCampo.length === 0) {
    return 0;
  }

  let mejorFactor = 0;
  const maxDist = tokenQuery.length >= 8 ? 2 : tokenQuery.length >= 4 ? 1 : 0;

  for (let i = 0; i < tokensCampo.length; i++) {
    const candidato = tokensCampo[i];
    if (candidato === tokenQuery) {
      return 100 * peso;
    }
    if (candidato.startsWith(tokenQuery)) {
      if (85 > mejorFactor) mejorFactor = 85;
      continue;
    }
    if (tokenQuery.length >= 3 && candidato.includes(tokenQuery)) {
      if (70 > mejorFactor) mejorFactor = 70;
      continue;
    }
    if (maxDist > 0 && Math.abs(candidato.length - tokenQuery.length) <= maxDist) {
      const dist = distanciaDamerauLevenshtein(tokenQuery, candidato, maxDist);
      if (dist <= maxDist) {
        const factorEdicion = dist === 1 ? 58 : 44;
        if (factorEdicion > mejorFactor) {
          mejorFactor = factorEdicion;
        }
      }
    }
  }

  return mejorFactor * peso;
}

/**
 * Ejecuta búsqueda difusa ponderada sobre el catálogo de libros (§10.3).
 * - Si la consulta está vacía o solo tiene símbolos/espacios, retorna la lista original intacta.
 * - Pesos: título (3), ISBN exacto/normalizado (3), autor (2), género (1).
 */
export function buscarLibrosDifuso(
  libros: readonly LibroCatalogo[],
  consultaRaw: string
): LibroCatalogo[] {
  return buscarLibrosConPuntaje(libros, consultaRaw).map((r) => r.libro);
}

export function buscarLibrosConPuntaje(
  libros: readonly LibroCatalogo[],
  consultaRaw: string
): ResultadoBusquedaDifusa[] {
  if (!consultaRaw || !consultaRaw.trim()) {
    return libros.map((libro) => ({ libro, puntaje: 0 }));
  }

  const consultaNorm = normalizarTextoBusqueda(consultaRaw);
  const tokensConsulta = tokenizarBusqueda(consultaNorm);
  const isbnConsulta = normalizarIsbn(consultaRaw);

  if (tokensConsulta.length === 0 && !isbnConsulta) {
    return [...libros].map((libro) => ({ libro, puntaje: 0 }));
  }

  const resultados: ResultadoBusquedaDifusa[] = [];

  for (let i = 0; i < libros.length; i++) {
    const libro = libros[i];
    const isbnLibro = normalizarIsbn(libro.isbn);
    const isbnRawNorm = libro.isbn.toLowerCase().trim();
    const queryRawLower = consultaRaw.toLowerCase().trim();

    // Coincidencia directa por ISBN (con o sin guiones)
    if (
      (isbnConsulta.length >= 4 && isbnLibro.includes(isbnConsulta)) ||
      isbnRawNorm === queryRawLower
    ) {
      const esExacto = isbnLibro === isbnConsulta || isbnRawNorm === queryRawLower;
      resultados.push({
        libro,
        puntaje: (esExacto ? 120 : 95) * PESO_ISBN
      });
      continue;
    }

    if (tokensConsulta.length === 0) {
      continue;
    }

    const tituloNorm = normalizarTextoBusqueda(libro.titulo);
    const tokensTitulo = tokenizarBusqueda(tituloNorm);

    const autoresNorm = normalizarTextoBusqueda(
      libro.autores.map((a) => a.nombreAutor).join(' ')
    );
    const tokensAutores = tokenizarBusqueda(autoresNorm);

    const generoNorm = normalizarTextoBusqueda(libro.nombreGenero);
    const tokensGenero = tokenizarBusqueda(generoNorm);

    let puntajeTotal = 0;
    let todosLosTokensCoinciden = true;

    // Bonificación si la frase completa coincide en título o autor
    if (tituloNorm === consultaNorm) {
      puntajeTotal += 150 * PESO_TITULO;
    } else if (tituloNorm.includes(consultaNorm)) {
      puntajeTotal += 60 * PESO_TITULO;
    } else if (autoresNorm.includes(consultaNorm)) {
      puntajeTotal += 60 * PESO_AUTOR;
    }

    for (let t = 0; t < tokensConsulta.length; t++) {
      const token = tokensConsulta[t];
      const pTitulo = puntuarTokenContraCampo(token, tituloNorm, tokensTitulo, PESO_TITULO);
      const pAutor = puntuarTokenContraCampo(token, autoresNorm, tokensAutores, PESO_AUTOR);
      const pGenero = puntuarTokenContraCampo(token, generoNorm, tokensGenero, PESO_GENERO);
      const pIsbn =
        isbnLibro.includes(token) || isbnRawNorm.includes(token) ? 90 * PESO_ISBN : 0;

      const mejorToken = Math.max(pTitulo, pAutor, pGenero, pIsbn);
      if (mejorToken <= 0) {
        todosLosTokensCoinciden = false;
        break;
      }
      puntajeTotal += mejorToken;
    }

    if (todosLosTokensCoinciden && puntajeTotal > 0) {
      resultados.push({ libro, puntaje: puntajeTotal });
    }
  }

  resultados.sort((a, b) => {
    if (b.puntaje !== a.puntaje) {
      return b.puntaje - a.puntaje;
    }
    return a.libro.titulo.localeCompare(b.libro.titulo, 'es');
  });

  return resultados;
}
