export interface Configuracion {
  codigo_configuracion: number;
  codigo_aplicacion: string;
  nombre_configuracion: string;
  valor_configuracion: string;
  descripcion_configuracion: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}
// Este archivo es autogenerado. No lo modifiques manually.
// (edit: la nota es de plantilla; este archivo SÍ se modifica a mano para
// agregar interfaces del proyecto como Area, Registro, etc., según el bloque
// "Proyecto interfaces" más abajo).


export interface Aplicacion {
  codigo_aplicacion: string;
  nombre_aplicacion: string;
  estado: string;
}

export interface Clase {
  codigo_clase: number;
  nombre_clase: string;
  estado: string;
}

export interface Menu {
  codigo_menu: number;
  codigo_padre: number;
  nombre: string;
  icono: string;
  path: string;
  estado: string;
  codigo_aplicacion: string;
}

export interface MenuTipoUsuario {
  codigo_menu_tipo_usuario: number;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  codigo_menu: number;
  codigo_tipo_usuario: number;
}

export interface Permisos {
  codigo_permiso: number;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  codigo_tipo_permiso: number;
  codigo_menu_tipo_usuario: number;
}

export interface Propiedad {
  codigo_propiedad: number;
  nombre_propiedad: string;
  valor_propiedad: string;
  estado: string;
  codigo_aplicacion: string;
}

export interface TipoPermiso {
  codigo_tipo_permiso: number;
  nombre_tipo_permiso: string;
  mnemonico: string;
  estado: string;
}

export interface TipoUsuario {
  codigo_tipo_usuario: number;
  codigo_clase: number;
  nombre_tipo_usuario: string;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
}

export interface TipoUsuarioAplicacion {
  codigo_tipo_usuario_aplicacion: number;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  codigo_aplicacion: string;
  codigo_tipo_usuario: number;
}

export interface Usuario {
  codigo_usuario: number;
  id_usuario: string;
  condicion: string;
  estado: string;
  usuario_modificacion: string;
  fecha_modificacion: Date | string;
  codigo_tipo_usuario: number;
}

export interface UsuarioTipoUsuario {
  codigo_usuario_tipo_usuario: number;
  estado: string;
  codigo_usuario: number;
  codigo_tipo_usuario: number;
}

export interface Auth {
  message: string;
  token: string;
  expiresIn: string;
  user:User;
  perfiles: any;
}

export interface User {
  codigo_usuario: number;
  usuario: string;
  correo_usuario: string;
  condicion: string;
  id_usuario: string;
  codigo_empleado: string;
}

export interface FichaSocialHistorica {
  CODIGO: string;
  NOMBRE: string;
  LOCALIDAD: string;
  CEDULA: string;
  MAIL: string;
  GRUPO_DEPARTAMENTO: string;
  DEPARTAMENTO: string;
  CARGO: string;
  CODIGO_JEFE: string;
}

export interface InformacionExterna {
  codigo_informacion_externa: number;
  codigo_usuario: number;
  identificador: string;
  nombres: string;
  passcode: string;
  estado: string;
  fecha_creacion: Date | string;
  usuario_creacion: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
} 



////////////////////////////////////////////////////////////Proyecto interfaces

export interface Area {
  codigo_area: number;
  nombre_area: string;
  nombre_ficha_social: string;
  usuario_calidad: string;
  regional: string;
  respCtrlProd: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface TipoMotivo {
  codigo_tipo_motivo: number;
  nombre_tipo_motivo: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface ElementoAsociacion {
  codigo_elemento_asociacion: number;
  columna: string;
  descripcion: string;
  data_type: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface AreaTipoMotivo {
  codigo_area_tipo_motivo: number;
  codigo_area: number;
  codigo_tipo_motivo: number;
  correo_notificacion: string;
  /** Discriminador de fuente de datos: MANUAL | CONSULTA | ESCANEO (ver MODOS). */
  tipo_fuente: string;
  /**
   * Valor numérico del modo elegido (proviene de `MODOS[*].valor` en .env).
   * Se persiste en `area_tipo_motivo` y se hereda automáticamente del modo
   * seleccionado en el modal de asignación de fuente.
   */
  valor: string;
  /** Parámetro del modo (p. ej. nombre lógico de SP) o "" cuando no aplica. */
  caso: string;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface Origen {
  codigo_origen: number;
  codigo_area_tipo_motivo: number;
  nombre_origen: string;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface Componente {
  codigo_componente: number;
  nombre_componente: string;
  unidades: string;
  RespCtrlProd: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface TipoMotivoComponente {
  codigo_tipo_motivo_componente: number;
  codigo_tipo_motivo: number;
  codigo_componente: number;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface Asociacion {
  codigo_asociacion: number;
  codigo_elemento_asociacion: number;
  codigo_componente: number;
  codigo_area_tipo_motivo: number;
  codigo_tipo_medicion: number;
  tabla: string;
  tabla_version: number;
  orden: number;
  etiqueta: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface TipoMedicion {
  codigo_tipo_medicion: number;
  nombre_tipo_medicion: string;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface CausaDefecto {
  codigo_causa_defecto: number;
  codigo_origen_componente: number;
  nombre_causa_defecto: string;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface Parametros {
  codigo_parametro: number;
  codigo_componente: number;
  nombre_parametro: string;
  valor_parametro: string;
  descripcion: string;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface Registro {
  codigo_registro: number;
  /**
   * @deprecated Las causas viven en `registro_causa_defecto`.
   * Se mantiene opcional por compatibilidad con payloads antiguos.
   */
  codigo_causa_defecto?: number;
  fecha_registro: Date | string;
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  regional: string;
  departamento: string;
  motivo: string;
  origen: string;
  componente: string;
  /** Texto denormalizado de causas (p. ej. "Causa A; Causa B"). */
  causa_defecto: string;
  /**
   * Unidades físicas que representa este registro (variación).
   * VARCHAR(50) en BD — se envía como string.
   */
  cantidad: string;
  unidades: string;
  maquina: string;
  /** Material / orden / ticket / código escaneado. */
  material: string;
  /**
   * Campo auxiliar para procesos legacy no mapeados: proveedor, tienda,
   * cliente, etc. Default `N.A.` cuando no aplica.
   */
  comodin: string;
  /**
   * Número de pedido (BI.CuboDespachos). Obligatorio cuando
   * MOTIVO = GESTIÓN ADM. DISTRI.; `N.A.` en el resto de flujos.
   */
  pedido?: string;
  /** @deprecated Usar `material`. Se conserva por compatibilidad temporal. */
  codigo_ticket?: string;
  codigo_empleado: string;
  tiempo: number;
  estado: string;
  fecha_creacion: Date | string;
  usuario_creacion: string;
  /**
   * Solo en UPDATE. En INSERT no se envía: el backend lo deja vacío
   * hasta que el usuario edite el registro.
   */
  fecha_modificacion?: Date | string | null;
  /** `codigo_empleado` de quien edita. Solo en UPDATE. */
  usuario_modificacion?: string | null;
}

/** Puente M:N registro ↔ causa_defecto. */
export interface RegistroCausaDefecto {
  codigo_registro_causa_defecto: number;
  codigo_registro: number;
  codigo_causa_defecto: number;
  estado: string;
  fecha_modificacion?: Date | string | null;
  usuario_modificacion?: string | null;
}

export interface Detalle {
  codigo_detalle: number;
  codigo_registro: number;
  codigo_asociacion : number;
  muestra: number;
  valor: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface OrigenComponente {
  codigo_origen_componente: number;
  codigo_origen: number;
  codigo_componente: number;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface Subcomponentes {
  codigo_subcomponente: number;
  codigo_elemento_asociacion: number;
  descripcion: string;
  puesto_trabajo: string;
  codigo_operador: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

////////////////////////////////////////////////////////////Interfaces específicas de muestreo

/**
 * Fila devuelta por el endpoint `getTablaParamsVirtual`
 * (`/api/servicios/getParamsTablaCatalogo`). El backend entrega la "tabla
 * virtual" que combina Área × Motivo × Origen × Componente × Causa de defecto
 * para que el wizard de captura de muestreo encadene los pasos sin tener que
 * llamar a N servicios. Cada fila es una combinación posible.
 *
 * Las claves `codigo_*` son las FK reales; los `nombre_*` son los textos
 * ya denormalizados por el backend (para no tener que cruzar manualmente).
 */
export interface MuestreoTablaVirtual {
  codigo_area: number;
  codigo_area_tipo_motivo: number;
  codigo_tipo_motivo: number;
  codigo_origen: number;
  codigo_origen_componente: number;
  codigo_componente: number;
  codigo_causa_defecto: number;
  nombre_area: string;
  nombre_ficha_social: string;
  nombre_tipo_motivo: string;
  nombre_origen: string;
  nombre_componente: string;
  nombre_causa_defecto: string;
}

export interface OrdenesTrabajadas {
  NUM_ORDEN: string;
  Material: string;
  Descripcion: string;
  CODIGO_EMP: string;
  MAQUINA: string;
  FECHA_HORA_UNIFICADA: string;
}

export interface Maquina {
  id_maq: number;
  maquina: string;
  componente: string;
  actividad: string;
  regional: string;
  departamento?: string;
}

export interface MaquinasMantenimiento {
  id_maq: number;
  maquina: string;
  componente: string;
  actividad: string;
  regional: string;
  departamento?: string;
}