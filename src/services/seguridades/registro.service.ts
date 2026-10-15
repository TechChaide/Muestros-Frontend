import type { Registro } from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";
import { fetchWithAuth } from "@/lib/http-client";
import { auditFieldsOnEdit } from "@/lib/datetime2";

const API_URL = `${environment.appAPI}/api/registro`;

function getCodigoEmpleadoSesion(): string {
  if (typeof window === "undefined") return "";
  try {
    const parsed = JSON.parse(window.localStorage.getItem("user") || "{}");
    return String(parsed?.codigo_empleado ?? "").trim();
  } catch {
    return "";
  }
}

export const registroService = {
  async getAll(): Promise<BodyListResponse<Registro>> {
    const response = await fetchWithAuth(API_URL);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to fetch registros');
    }
    return response.json();
  },

  async getById(id: number | string): Promise<BodyResponse<Registro>> {
    const response = await fetchWithAuth(`${API_URL}/${id}`);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to fetch registro with id ${id}`);
    }
    return response.json();
  },

  async save(data: Registro): Promise<BodyResponse<Registro>> {
    const isEdit = Number(data.codigo_registro) > 0;
    const payload: Registro = { ...data };

    if (!isEdit) {
      // INSERT: usuario_modificacion / fecha_modificacion solo en edición.
      delete payload.usuario_modificacion;
      delete payload.fecha_modificacion;
    } else {
      Object.assign(payload, auditFieldsOnEdit(getCodigoEmpleadoSesion()));
    }

    // eslint-disable-next-line no-console
    console.log("[registroService.save] payload →", payload);
    // eslint-disable-next-line no-console
    console.log("[registroService.save] unidades =", JSON.stringify(payload.unidades));
    // eslint-disable-next-line no-console
    console.log("[registroService.save] fecha_registro =", payload.fecha_registro);
    // eslint-disable-next-line no-console
    console.log("[registroService.save] fecha_creacion =", payload.fecha_creacion);
    // eslint-disable-next-line no-console
    console.log(
      "[registroService.save] usuario_modificacion =",
      payload.usuario_modificacion ?? "(omitido, alta)",
    );

    const response = await fetchWithAuth(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || 'Failed to save registro');
    }
    return response.json();
  },

  async delete(id: number | string): Promise<void> {
    const response = await fetchWithAuth(`${API_URL}/${id}`, {
      method: 'DELETE', 
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorBody.message || `Failed to delete tipo-usuario-aplicacion with id ${id}`);
    }
  },
};
