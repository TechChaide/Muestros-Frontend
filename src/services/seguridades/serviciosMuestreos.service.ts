import type {
  Area,
  AreaTipoMotivo,
  Maquina,
  MaquinasMantenimiento,
  OrdenesTrabajadas,
  TipoMotivo,
  TipoUsuarioAplicacion,
} from "@/types/interfaces";
import type { BodyListResponse } from "@/types/body-list-response";
import type { BodyResponse } from "@/types/body-response";
import { environment } from "@/environments/environments.prod";
import { fetchWithAuth } from "@/lib/http-client";

const API_URL = `${environment.appAPI}/api/servicios`;

export const serviciosMuestreosService = {
  async getAreasMuestreablesByCodigoInspector(
    codigoPersona: string | number,
  ): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(
      API_URL + "/getAreasMuestreablesByPersona",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ CodigoUsuario: codigoPersona }),
      },
    );
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message || "Failed to fetch areas muestreables",
      );
    }
    return response.json();
  },

  async getTablaParamsVirtual(): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(API_URL + "/getParamsTablaCatalogo", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message || "Failed to fetch tabla params virtual",
      );
    }
    return response.json();
  },

  /**
   * Devuelve las máquinas que aplican para el área indicada.
   *
   * Nota: el backend acepta el NOMBRE del área (no el código), según
   * convención del SP `getMaquinasParos`. Por eso este método recibe
   * `nombreArea` (no `codigoArea`).
   *
   * Específico para el flujo de Paros de Máquina (`/dashboard/procesos/parosM`).
   * El muestreo regular sigue usando `getInformacionOrdenesByResponsblesYCaso`.
   */
  async getMaquinas(nombreArea: string): Promise<BodyListResponse<Maquina>> {
    const response = await fetchWithAuth(`${API_URL}/getMaquinasParos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Codigo: nombreArea }),
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message || `Failed to fetch maquinas for area ${nombreArea}`,
      );
    }
    return response.json();
  },

  async getInformacionOrdenesByResponsblesYCaso(
    caso: string,
    responsables: string,
    Codigo: string,
  ): Promise<BodyListResponse<OrdenesTrabajadas>> {
    const response = await fetchWithAuth(`${API_URL}/getOrdenesTrabajadas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Caso: caso,
        Responsables: responsables,
        Codigo: Codigo,
      }),
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message ||
          `Failed to fetch informacion ordenes with caso ${caso} and responsables ${responsables}`,
      );
    }
    return response.json();
  },

  async getMaquinasMantenimiento(): Promise<
    BodyListResponse<MaquinasMantenimiento>
  > {
    const response = await fetchWithAuth(`${API_URL}/getMaquinasOrigen`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message || `Failed to fetch maquinass mantenimiento`,
      );
    }
    return response.json();
  },


  async getMaterialesByCentroResponsables(
    centro: string,
    responsables: string
  ): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(`${API_URL}/getmateriales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Centro: centro,
        Resp: responsables
      }),
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message ||
          `Failed to fetch informacion ordenes with centro ${centro} and responsables ${responsables}`,
      );
    }
    return response.json();
  },


  async getMAquinasByCentroYAreaOrigen(
    centro: string,
    departamento: string
  ): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(`${API_URL}/maquinasByRegionalDepartamento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Regional: centro,
        Departamento: departamento
      }),
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message ||
          `Failed to fetch informacion ordenes with regional ${centro} and departamento ${departamento}`,
      );
    }
    return response.json();
  },

  async getInformacionProveedores(
    regional: string,
    departamento: string,
    componente: string
  ): Promise<BodyResponse<any>> {
    const response = await fetchWithAuth(
      `${API_URL}/getProveedores`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Regional: regional, Departamento: departamento, Componente: componente }),
      },
    );
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message ||
          `Failed to fetch proveedores with regional ${regional}, departamento ${departamento} and componente ${componente}`,
      );
    }
    return response.json();
  },




  async getMaterialesByCentroResponsablesAsYouType(
    params: { Centro: string; Busqueda: string },
    signal?: AbortSignal,
  ): Promise<any> {
    const qs = new URLSearchParams(params);
    const response = await fetchWithAuth(`${API_URL}/materiales/buscar?${qs.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal,
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: "Error desconocido" }));
      throw new Error(errorBody.message || `Failed to search materiales for ${params.Busqueda}`);
    }
    return response.json();
  },

  /**
   * Comodín "tienda": catálogo completo de tiendas propias
   * (CatalogoTiendas, ~25 filas). El filtro por texto lo hace el
   * frontend (CatalogSelect) en memoria.
   */
  async getInformacionTiendas(): Promise<BodyListResponse<any>> {
    const response = await fetchWithAuth(`${API_URL}/tiendas`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(errorBody.message || "Failed to fetch tiendas");
    }
    return response.json();
  },

  /**
   * Comodín "cliente" (interlocutor externo): DEVOLUCIONES EXTERNAS
   * ESPUMA. Búsqueda as-you-type contra BI.MaestroClientesInterlocutores
   * (tabla enorme): requiere `busqueda` (min 2 caracteres) y filtra por
   * ciudad según la regional del usuario.
   */
  async getInformacionClientesInterlocutores(
    params: { Regional: string; Busqueda: string },
    signal?: AbortSignal,
  ): Promise<BodyListResponse<any>> {
    const qs = new URLSearchParams(params);
    const response = await fetchWithAuth(
      `${API_URL}/clientes-interlocutores/buscar?${qs.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal,
      },
    );
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message ||
          `Failed to search clientes interlocutores for ${params.Busqueda}`,
      );
    }
    return response.json();
  },

  /**
   * Campo "material" cuando MOTIVO = GESTIÓN ADM. DISTRI.: búsqueda de
   * pedidos contra BI.CuboDespachos (tabla enorme). Sin `Busqueda`
   * devuelve los 50 pedidos más recientes; con `Busqueda` filtra por
   * coincidencia.
   */
  async getInformacionPedidos(
    params: { Busqueda: string },
    signal?: AbortSignal,
  ): Promise<BodyListResponse<any>> {
    const qs = new URLSearchParams(params);
    const response = await fetchWithAuth(
      `${API_URL}/pedidos/buscar?${qs.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal,
      },
    );
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Error desconocido" }));
      throw new Error(
        errorBody.message || `Failed to search pedidos for ${params.Busqueda}`,
      );
    }
    return response.json();
  },

};
