// Raw response shapes from ticket.xutil.net (as observed in network captures)

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  id_token: string;
  token_type: string; // "Bearer"
  expires_in: number; // seconds (~15.8M ≈ 183 days)
  info: unknown[];
}

export interface RawProvincia {
  id: number;
  nombre_provincia: string;
}

export interface RawSubcatActividad {
  id_actividad: number;
  subcategory: string | null;
  activity: string;
}

// Item from POST /servicios -> data[]
export interface RawService {
  id: number; // local_servicio id
  nombre: string;
  subcategorias_actividades: RawSubcatActividad[];
  establishment: string;
  municipio: string;
  provincia: string;
  precio: number;
  currency: string | null;
  rating: number;
  default_quantity: number;
  max_quantity: number;
  visibilidad_aplicacion: number;
  disponibilidades: number;
  admite_sala_espera_virtual: number; // 0 | 1
  hasprovider: number;
  tiene_validacion: number; // 0 | 1
  image_url: string;
  entrega_domicilio: number;
  views: number;
  tipo_servicio: unknown[];
  is_favorite: boolean;
  has_reservation: boolean;
  has_waiting_room: boolean;
}

export interface ServiciosMeta {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  first_page: number;
  last_page: number;
  total: number;
  per_page: number;
  from: number;
  to: number;
}

export interface ServiciosResponse {
  data: RawService[];
  meta: ServiciosMeta;
  status: number;
}

export interface ServiciosRequest {
  page: number;
  province_id: number | string;
  municipality_id: number | string | null;
  service_or_prov: number[] | string;
  find_by_dpa: unknown | null;
  orderBy: unknown | null;
  rating: number | null;
  limit: number;
  serviceName: string;
  reservation_date_ini: string | null;
  reservation_date_end: string | null;
  professional_name: string;
  currency_values: unknown[];
  name?: string;
}

export interface RawDatoAdicional {
  id_local_servicio: number;
  label: string;
  name: string;
  type: string;
  length: number;
  required: boolean;
  regex: string | null;
  hepler: string; // sic (typo in upstream API)
  modelo: string | null;
}

// GET /servicio/{id}
export interface RawValoracion {
  id: number;
  valoracion: number;
  mensaje: string;
  usuario: string;
  date: string;
}

export interface ReviewsSlice {
  "5_stars": number;
  "4_stars": number;
  "3_stars": number;
  "2_stars": number;
  "1_stars": number;
  sin_valorar: number;
}

export interface ServicioDetail {
  id: number;
  establishment_id: number;
  nombre: string;
  nombre_entidad: string;
  establecimiento: string;
  provincia: string;
  municipio: string;
  latitud: string | null;
  longitud: string | null;
  admite_sala_espera_virtual: number;
  disponible: boolean;
  disponibilidades: number;
  tiene_validacion: number;
  views: number;
  turns: string;
  datos_adicionales: RawDatoAdicional[];
  cantidad_datos_adicionales: number;
  public_link: string;
  descripcion?: string;
  image_urls?: string[];
  valoraciones?: RawValoracion[];
  reviews_slice?: ReviewsSlice;
  subcategorias_actividades?: RawSubcatActividad[];
}

// GET /sala-espera-virtual/v2/posicion-visual -> data[]
export interface RawTurnoPosicion {
  id_turno_servicio: number;
  posicion: number; // user position in queue
  denominacion: string;
  total: number; // total in queue
}

export interface RawSalaEspera {
  id_sala_espera: number;
  id_wso2: string;
  local_denominacion: string;
  servicio_denominacion: string;
  id_local_servicio: number;
  id_local: number;
  provincia: string;
  municipio: string;
  turnos: RawTurnoPosicion[];
}

export interface PosicionVisualResponse {
  info: { success: boolean; code: number; menssage: string };
  data: RawSalaEspera[];
}

// Fuel activity id in xutil taxonomy ("Compra de combustible")
export const FUEL_ACTIVITY_ID = 321;
