export interface RedSocialConfig {
  readonly nombre: string;
  readonly url: string;
  readonly icono: 'github' | 'x' | 'instagram' | 'youtube' | 'web';
}

export interface ContactoConfig {
  readonly direccion?: string;
  readonly correo?: string;
  readonly telefono?: string;
  readonly horario?: string;
}

export interface SiteConfig {
  readonly nombre: string;
  readonly nombreCorto: string;
  readonly subtitulo: string;
  readonly descripcionFooter: string;
  readonly recomendaciones: readonly string[];
  readonly contacto: ContactoConfig;
  readonly redesSociales: readonly RedSocialConfig[];
}

export const SITE_CONFIG: SiteConfig = {
  nombre: 'BiblioTech',
  nombreCorto: 'BiblioTech',
  subtitulo: 'Biblioteca Universitaria',
  descripcionFooter:
    'Catálogo bibliográfico abierto y gestión digital de préstamos académicos con consulta de disponibilidad en tiempo real.',
  recomendaciones: [
    'Cancela tus reservas hasta 24 horas antes de la fecha de inicio si no podrás asistir.',
    'Toda reserva requiere una fecha y hora de inicio futura y una fecha de entrega posterior.',
    'Verifica la disponibilidad de ejemplares en el rango deseado antes de confirmar tu préstamo.',
    'Mantén tus datos de contacto actualizados para facilitar la trazabilidad de tus reservas.',
    'Cuida el material bibliográfico y entrégalo puntualmente para que otros lectores puedan consultarlo.'
  ],
  contacto: {},
  redesSociales: []
};
