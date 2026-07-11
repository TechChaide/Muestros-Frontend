
// Este archivo es autogenerado. No lo modifiques manually.

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
  regional: string;
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
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface AreaTipoMotivo {
  codigo_area_tipo_motivo: number;
  codigo_area: number;
  codigo_tipo_motivo: number;
  correo_notificacion: string;
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
  codigo_tipo_motivo: number;
  tabla: string;
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}

export interface CausaDefecto {
  codigo_causa_defecto: number;
  codigo_origen_componente: number;
  nombre_causa_defecto: string;
  estado: string;
  fecha_modificacion?: Date | string;
  usuario_modificacion?: string;
}

export interface Registro {
  codigo_registro: number;
  codigo_causa_defecto: number;
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
  causa_defecto: string;
  maquina: string;
  codigo_empleado: string;
  estado: string;
  fecha_creacion: Date | string;
  usuario_creacion: string;
}

export interface Detalle {
  codigo_detalle: number;
  codigo_registro: number;
  codigo_asociacion : number;
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
  estado: string;
  fecha_modificacion: Date | string;
  usuario_modificacion: string;
}