import { LibroCatalogo } from '../models/libro.model';
import {
  buscarLibrosConPuntaje,
  buscarLibrosDifuso,
  distanciaDamerauLevenshtein,
  normalizarTextoBusqueda
} from './busqueda-difusa';

const CATALOGO_PRUEBA: LibroCatalogo[] = [
  {
    idLibro: 1,
    isbn: '978-0307474728',
    titulo: 'Cien Años de Soledad',
    idGenero: 1,
    nombreGenero: 'Realismo Mágico',
    autores: [{ idAutor: 10, nombreAutor: 'Gabriel García Márquez' }],
    anioPublicacion: 1967,
    totalEjemplares: 3,
    ejemplaresDisponibles: 2
  },
  {
    idLibro: 2,
    isbn: '978-0132350884',
    titulo: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    idGenero: 2,
    nombreGenero: 'Ingeniería de Software',
    autores: [{ idAutor: 20, nombreAutor: 'Robert C. Martin' }],
    anioPublicacion: 2008,
    totalEjemplares: 4,
    ejemplaresDisponibles: 1
  },
  {
    idLibro: 3,
    isbn: '978-0441172719',
    titulo: 'Dune',
    idGenero: 3,
    nombreGenero: 'Ciencia Ficción',
    autores: [{ idAutor: 30, nombreAutor: 'Frank Herbert' }],
    anioPublicacion: 1965,
    totalEjemplares: 2,
    ejemplaresDisponibles: 0
  }
];

describe('Búsqueda difusa ponderada (D-6 / §10.3)', () => {
  it('normaliza tildes, diéresis y signos de puntuación mediante NFD', () => {
    expect(normalizarTextoBusqueda('Gabriel García Márquez')).toBe('gabriel garcia marquez');
    expect(normalizarTextoBusqueda('¡Cien Años de Soledad!')).toBe('cien anos de soledad');
  });

  it('calcula distancia Damerau-Levenshtein incluyendo transposiciones adyacentes', () => {
    expect(distanciaDamerauLevenshtein('soledad', 'solerad', 2)).toBe(1);
    expect(distanciaDamerauLevenshtein('dune', 'duen', 2)).toBe(1);
    expect(distanciaDamerauLevenshtein('codigo', 'xyzabc', 2)).toBeGreaterThan(2);
  });

  it('encuentra "Gabriel García Márquez" al buscar "garcia marquez" sin tildes', () => {
    const res = buscarLibrosDifuso(CATALOGO_PRUEBA, 'garcia marquez');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].idLibro).toBe(1);
  });

  it('encuentra "Cien Años de Soledad" al buscar "cien anos"', () => {
    const res = buscarLibrosDifuso(CATALOGO_PRUEBA, 'cien anos');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].idLibro).toBe(1);
  });

  it('encuentra "Cien Años de Soledad" con error tipográfico "solerad" (distancia 1)', () => {
    const res = buscarLibrosDifuso(CATALOGO_PRUEBA, 'solerad');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].idLibro).toBe(1);
  });

  it('encuentra por ISBN con o sin guiones ("978-0132350884" y "9780132350884")', () => {
    const conGuion = buscarLibrosDifuso(CATALOGO_PRUEBA, '978-0132350884');
    expect(conGuion.length).toBe(1);
    expect(conGuion[0].idLibro).toBe(2);

    const sinGuion = buscarLibrosDifuso(CATALOGO_PRUEBA, '9780132350884');
    expect(sinGuion.length).toBe(1);
    expect(sinGuion[0].idLibro).toBe(2);
  });

  it('devuelve todos los libros sin filtrar cuando la consulta está vacía y no falla con símbolos especiales', () => {
    expect(buscarLibrosDifuso(CATALOGO_PRUEBA, '').length).toBe(3);
    expect(buscarLibrosDifuso(CATALOGO_PRUEBA, '   ').length).toBe(3);
    expect(() => buscarLibrosConPuntaje(CATALOGO_PRUEBA, '.*[()]+?$^\\')).not.toThrow();
  });

  it('procesa 10 000 libros en un presupuesto razonable (sin bloquear la UI)', () => {
    const loteGrande: LibroCatalogo[] = Array.from({ length: 10000 }, (_, i) => ({
      ...CATALOGO_PRUEBA[i % CATALOGO_PRUEBA.length],
      idLibro: i + 1
    }));

    const inicio = performance.now();
    const res = buscarLibrosDifuso(loteGrande, 'garcia');
    const duracionMs = performance.now() - inicio;

    expect(res.length).toBeGreaterThan(3000);
    expect(duracionMs).toBeLessThan(250);
  });
});
