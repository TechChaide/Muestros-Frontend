
import type { Auth, Usuario } from "@/types/interfaces";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";
import { fetchWithAuth } from "@/lib/http-client";
import { BodyListResponse } from "@/types/body-list-response";

const API_URL = `${environment.apiURL}/api/auths/login`;
const API_URL_CENTRAL = `${environment.apiURL}/api/auths/loginCentral`;

// Define a type for the login credentials
type LoginCredentials = {
  email: string;
  password: string;
};

// Tipo para login facial/central — aceptar string o el objeto facial
type LoginCentralCredentials = {
  email: string;
  password:
    | string
    | {
        CODIGO: string;
        NOMBRE: string;
        DEPARTAMENTO?: string;
        CENTRO?: string;
      };
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<BodyResponse<Auth>> {
    // Para compatibilidad, reenviamos cualquier llamada a `login()` hacia `loginCentral()`
    // Si se recibe un password string, lo pasamos tal cual; si es un objeto, también se envía.
    return this.loginCentral({ email: credentials.email, password: (credentials as any).password as any });
  },

  async loginCentral(credentials: any): Promise<BodyResponse<Auth>> {
    const response = await fetchWithAuth(API_URL_CENTRAL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
      skipAuth: false,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error al iniciar sesión facial.' }));
      throw new Error(errorBody.message || 'Ocurrió un error desconocido.');
    }
    
    return response.json() as Promise<BodyResponse<Auth>>;
  },

  async getUsersInfo(): Promise<BodyListResponse<any[]>> {
    const response = await fetchWithAuth(`${environment.apiURL}/api/usuarios/fichasUsuarios`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error al obtener usuarios.' }));
      throw new Error(errorBody.message || 'Ocurrió un error desconocido.');
    }

    return response.json();
  },
};
