
import type { FichaSocialHistorica, InformacionExterna, OrdenesTrabajadas, TipoUsuarioAplicacion } from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";
import { fetchWithAuth } from "@/lib/http-client";
import { string } from "zod";

const API_URL_qr = `${environment.apiScanner}/api/qr`;
const API_URL_bc = `${environment.apiScanner}/api/barcode`;

export const codesGRService = {

  async readQR(image: string): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(`${API_URL_qr}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: JSON.stringify({ image: image }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch ficha social historica`);
    }
    return response.json();
  },

  async generateQR(code: string): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(`${API_URL_qr}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: code }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch ficha social historica`);
    }
    return response.json();
  },

  async readBarcode(codigo: string): Promise<BodyResponse<any>> {
    const response = await fetchWithAuth(`${API_URL_bc}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: JSON.stringify({ image_base64: codigo }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch ficha social historica with codigo ${codigo}`);
    }
    return response.json();
  },


  async getInformacionUsuarioExternoByIdentificacion(codigo: string): Promise<BodyResponse<any>> {
    const response = await fetchWithAuth(`${API_URL_bc}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Identificador: codigo }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch informacion externa with identificador ${codigo}`);
    }
    return response.json();
  },

  async getInformacionOrdenesByResponsblesYCaso(data: string): Promise<BodyListResponse<OrdenesTrabajadas>> {
    const response = await fetchWithAuth(`${API_URL_bc}/getOrdenesTrabajadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: string }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch informacion ordenes with caso and responsables `);
    }
    return response.json();
  },


};
