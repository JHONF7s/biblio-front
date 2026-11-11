import { sanitizarReturnUrl } from './return-url.util';

describe('sanitizarReturnUrl (S-F5 / Anexo 3)', () => {
  it('permite rutas internas relativas válidas', () => {
    expect(sanitizarReturnUrl('/loans')).toBe('/loans');
    expect(sanitizarReturnUrl('/catalog?q=dune')).toBe('/catalog?q=dune');
    expect(sanitizarReturnUrl('/catalog/12')).toBe('/catalog/12');
    expect(sanitizarReturnUrl('/catalog?genero=1&disponibles=1')).toBe(
      '/catalog?genero=1&disponibles=1'
    );
  });

  it('rechaza todos los vectores maliciosos del Anexo 3 devolviendo "/"', () => {
    const vectoresMaliciosos: Array<string | null | undefined> = [
      '//evil.com',
      '/\\evil.com',
      '\\\\evil.com',
      'https://evil.com',
      'http:evil.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '/%2f%2fevil.com',
      '/..//evil.com',
      '/\t/evil.com',
      '/%0d%0aSet-Cookie:x',
      '',
      '   ',
      '/' + 'a'.repeat(5000),
      null,
      undefined,
      '/login',
      '/register'
    ];

    for (const vector of vectoresMaliciosos) {
      expect(sanitizarReturnUrl(vector)).toBe('/');
    }
  });
});
