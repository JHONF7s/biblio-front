export interface BackendErrorPayload {
  readonly timestamp?: string;
  readonly status?: number;
  readonly error?: string;
  readonly message?: string;
  readonly details?: Readonly<Record<string, string>>;
}

export interface ApiError {
  readonly status: number;
  readonly mensaje: string;
  readonly detalles?: Readonly<Record<string, string>>;
}
