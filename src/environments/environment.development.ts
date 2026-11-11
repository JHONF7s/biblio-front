export interface EnvironmentConfig {
  readonly production: boolean;
  readonly apiUrl: string;
}

export const environment: EnvironmentConfig = {
  production: false,
  apiUrl: 'http://localhost:10101/biblioteca/api/v1'
};
