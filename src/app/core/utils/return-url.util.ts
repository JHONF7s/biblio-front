const MAX_RETURN_URL_LENGTH = 1024;

/**
 * Sanea un parámetro returnUrl para prevenir ataques de Open Redirect y XSS (S-F5).
 * Solo permite rutas internas relativas que comiencen con un único '/' seguido
 * de un carácter alfanumérico, guion o signo de interrogación, sin protocolos,
 * dobles barras ni caracteres de control.
 */
export function sanitizarReturnUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') {
    return '/';
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_RETURN_URL_LENGTH) {
    return '/';
  }

  // Rechazar caracteres de control, saltos de línea, tabulaciones o barras invertidas
  if (/[\x00-\x1f\x7f\\]/.test(trimmed)) {
    return '/';
  }

  // Decodificar una vez para detectar secuencias ocultas como /%2f%2f o /%0d%0a
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return '/';
  }

  if (/[\x00-\x1f\x7f\\]/.test(decoded)) {
    return '/';
  }

  // Debe iniciar exactamente con '/' pero NO con '//' ni '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || decoded.startsWith('//')) {
    return '/';
  }

  // Rechazar dobles barras en cualquier parte del path o traversal '..'
  const [pathPart] = decoded.split('?');
  if (pathPart.includes('//') || pathPart.includes('..')) {
    return '/';
  }

  // Rechazar esquemas de protocolo (http:, https:, javascript:, data:, vbscript:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(decoded) || decoded.includes(':')) {
    return '/';
  }

  // Evitar redirigir de vuelta a /login o /register para prevenir bucles
  if (
    pathPart === '/login' ||
    pathPart.startsWith('/login/') ||
    pathPart === '/register' ||
    pathPart.startsWith('/register/')
  ) {
    return '/';
  }

  return trimmed;
}
