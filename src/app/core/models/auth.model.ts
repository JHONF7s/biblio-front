export type Rol = 'ADMIN' | 'USUARIO';

export interface LoginRequest {
  readonly correo: string;
  readonly password: string;
}

export interface RegistroRequest {
  readonly documentoIdentidad: string;
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly password: string;
}

export interface AuthResponse {
  readonly token: string;
  readonly tipoToken: 'Bearer';
  readonly expiraEnMs: number;
  readonly correo: string;
  readonly rol: Rol;
  readonly nombreCompleto?: string;
}

export interface Usuario {
  readonly idUsuario: number;
  readonly documentoIdentidad: string;
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly rol: Rol;
  readonly estado: boolean;
}

export interface SesionActiva {
  readonly token: string;
  readonly correo: string;
  readonly rol: Rol;
  readonly nombreCompleto: string;
  readonly exp: number; // Timestamp en milisegundos
}
