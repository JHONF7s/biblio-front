export interface EstiloPortadaLibro {
  readonly gradiente: string;
  readonly acento: string;
  readonly iniciales: string;
}

const PALETAS_PORTADA: readonly { gradiente: string; acento: string }[] = [
  {
    gradiente: 'linear-gradient(145deg, #2b1e5c 0%, #4b32a8 52%, #6746e5 100%)',
    acento: '#c4b5fd'
  },
  {
    gradiente: 'linear-gradient(145deg, #16324f 0%, #1d4e89 55%, #2a6f97 100%)',
    acento: '#bae6fd'
  },
  {
    gradiente: 'linear-gradient(145deg, #1b4332 0%, #2d6a4f 55%, #40916c 100%)',
    acento: '#bbf7d0'
  },
  {
    gradiente: 'linear-gradient(145deg, #4a154b 0%, #6f1d57 52%, #9d174d 100%)',
    acento: '#fbcfe8'
  },
  {
    gradiente: 'linear-gradient(145deg, #3b2314 0%, #6c3b1c 55%, #9a5827 100%)',
    acento: '#fde68a'
  },
  {
    gradiente: 'linear-gradient(145deg, #1e293b 0%, #334155 55%, #4f46e5 100%)',
    acento: '#c7d2fe'
  }
];

/**
 * Calcula una portada tipográfica determinista basada en idGenero y título (F-3 / §10.3).
 * No inventa imágenes externas ni metadatos inexistentes en la API.
 */
export function generarEstiloPortada(idGenero: number, titulo: string): EstiloPortadaLibro {
  let hash = Math.abs(idGenero || 0) * 31;
  for (let i = 0; i < titulo.length; i++) {
    hash = (hash * 33 + titulo.charCodeAt(i)) >>> 0;
  }

  const paleta = PALETAS_PORTADA[hash % PALETAS_PORTADA.length];
  const palabras = titulo
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  let iniciales = 'LB';
  if (palabras.length >= 2) {
    iniciales = (palabras[0][0] + palabras[1][0]).toUpperCase();
  } else if (palabras.length === 1) {
    iniciales = palabras[0].slice(0, 2).toUpperCase();
  }

  return {
    gradiente: paleta.gradiente,
    acento: paleta.acento,
    iniciales
  };
}
