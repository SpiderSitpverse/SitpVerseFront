export interface Estacion {
  nombre: string;
  coords: [number, number];
}

export interface TroncalRoute {
  id: string;
  nombre: string;
  color: string;
  /** Same points as `estaciones`, in path order — the polyline is drawn by connecting real stations. */
  coords: [number, number][];
  portales: Estacion[];
  estaciones: Estacion[];
}

export const BOGOTA_CENTER: [number, number] = [4.65, -74.09];

/** Approximate map position per bus id, matched to its reported `ubicacion`, snapped to real stations. */
export const busPositions: Record<string, [number, number]> = {
  "1": [4.6168, -74.07216], // Calle 26 - Atrio (Troncal Caracas)
  "2": [4.68208, -74.12169], // Portal El Dorado (Calle 26)
  "3": [4.67555, -74.06985], // Escuela Militar (Calle 80)
  "4": [4.59735, -74.16933], // Portal Sur (NQS Sur)
  "5": [4.70665, -74.07123], // Humedal Córdoba (Suba)
  "6": [4.66867, -74.06024], // Héroes (Autopista Norte, cerca Calle 72)
  "7": [4.75548, -74.04589], // Portal Norte (Autopista Norte)
  "8": [4.63745, -74.09308], // Quinta Paredes (Calle 26)
};

/**
 * Real corridors and stations of the main troncales, sourced from
 * TransMilenio's own public digital-map API (mapadigital.transmilenio.gov.co),
 * queried via https://api.buscador-rutas.transmilenio.gov.co/api/v1/arcgis/estaciones.
 * Coordinates are official; edit/replace by re-querying that endpoint if the
 * network changes. Each troncal's stations are sorted along its dominant axis
 * (lat for north–south corridors, lng for east–west ones), so the polyline
 * follows the real streets instead of a straight line.
 */
const troncalesRaw: Omit<TroncalRoute, "coords">[] = [
  {
    id: "caracas",
    nombre: "Troncal Caracas",
    color: "#26358C",
    estaciones: [
      { nombre: "Calle 76", coords: [4.66323, -74.06125] },
      { nombre: "Calle 72 - Areandina", coords: [4.65844, -74.06206] },
      { nombre: "Flores", coords: [4.65482, -74.06309] },
      { nombre: "Calle 63", coords: [4.64771, -74.065] },
      { nombre: "Calle 57", coords: [4.64327, -74.06581] },
      { nombre: "Marly", coords: [4.63773, -74.06678] },
      { nombre: "Calle 45", coords: [4.63169, -74.06785] },
      { nombre: "Av. 39", coords: [4.62706, -74.06869] },
      { nombre: "Calle 34", coords: [4.62163, -74.06975] },
      { nombre: "Calle 26 - Atrio", coords: [4.6168, -74.07216] },
      { nombre: "Calle 22", coords: [4.61179, -74.07463] },
      { nombre: "Calle 19", coords: [4.60787, -74.07688] },
      { nombre: "Avenida Jiménez", coords: [4.60279, -74.0805] },
      { nombre: "Tercer Milenio", coords: [4.59814, -74.08386] },
    ],
    portales: [],
  },
  {
    id: "autopista-norte",
    nombre: "Autopista Norte",
    color: "#80BA27",
    estaciones: [
      { nombre: "Terminal", coords: [4.76902, -74.0435] },
      { nombre: "Calle 187", coords: [4.76336, -74.04448] },
      { nombre: "Portal Norte", coords: [4.75548, -74.04589] },
      { nombre: "Toberín", coords: [4.74713, -74.04716] },
      { nombre: "Calle 161", coords: [4.74213, -74.04795] },
      { nombre: "Mazurén", coords: [4.73539, -74.04906] },
      { nombre: "Calle 146", coords: [4.73138, -74.04974] },
      { nombre: "Calle 142", coords: [4.72682, -74.05055] },
      { nombre: "Alcalá - Colegio S. Tomás Dominicos", coords: [4.72147, -74.05144] },
      { nombre: "Prado", coords: [4.71451, -74.05261] },
      { nombre: "Calle 127", coords: [4.7045, -74.05429] },
      { nombre: "Pepe Sierra - Utel Universidad", coords: [4.69799, -74.05535] },
      { nombre: "Calle 106", coords: [4.69409, -74.05601] },
      { nombre: "Calle 100 - Marketmedios", coords: [4.6845, -74.05767] },
      { nombre: "Virrey - Cendiatra", coords: [4.67639, -74.05896] },
      { nombre: "Calle 85 - Gato Dumas", coords: [4.67153, -74.0598] },
      { nombre: "Héroes", coords: [4.66867, -74.06024] },
    ],
    portales: [
      { nombre: "Terminal", coords: [4.76902, -74.0435] },
      { nombre: "Portal Norte", coords: [4.75548, -74.04589] },
    ],
  },
  {
    id: "suba",
    nombre: "Troncal Suba",
    color: "#FCBD1B",
    estaciones: [
      { nombre: "Portal Suba", coords: [4.74699, -74.09425] },
      { nombre: "La Campiña", coords: [4.74263, -74.09122] },
      { nombre: "Suba - Tv. 91", coords: [4.73893, -74.08701] },
      { nombre: "21 Ángeles", coords: [4.73557, -74.08115] },
      { nombre: "Gratamira", coords: [4.72768, -74.07469] },
      { nombre: "Suba - Av. Boyacá", coords: [4.72141, -74.07478] },
      { nombre: "Niza - Calle 127", coords: [4.71197, -74.07232] },
      { nombre: "Humedal Córdoba", coords: [4.70665, -74.07123] },
      { nombre: "Av. Suba - Calle 116", coords: [4.69982, -74.07004] },
      { nombre: "Puentelargo", coords: [4.69353, -74.0672] },
      { nombre: "Suba Calle 100", coords: [4.68709, -74.06447] },
      { nombre: "Suba - Calle 95", coords: [4.68469, -74.06326] },
      { nombre: "Rionegro", coords: [4.68038, -74.06481] },
      { nombre: "San Martín", coords: [4.67641, -74.06718] },
    ],
    portales: [{ nombre: "Portal Suba", coords: [4.74699, -74.09425] }],
  },
  {
    id: "nqs-central",
    nombre: "NQS Central",
    color: "#AE6B00",
    estaciones: [
      { nombre: "La Castellana", coords: [4.67547, -74.06471] },
      { nombre: "NQS Calle 75", coords: [4.66999, -74.0716] },
      { nombre: "Avenida Chile", coords: [4.6664, -74.07466] },
      { nombre: "7 de Agosto", coords: [4.65717, -74.07773] },
      { nombre: "Movistar Arena", coords: [4.64984, -74.07839] },
      { nombre: "Campín - UAN", coords: [4.64593, -74.07868] },
      { nombre: "Universidad Nacional", coords: [4.63709, -74.07932] },
      { nombre: "Av. Eldorado", coords: [4.63018, -74.07992] },
      { nombre: "CAD", coords: [4.62316, -74.08445] },
      { nombre: "Paloquemao", coords: [4.61675, -74.08971] },
      { nombre: "Ricaurte", coords: [4.61151, -74.09404] },
      { nombre: "Guatoque - Veraguas", coords: [4.60404, -74.09478] },
      { nombre: "Tygua - San José", coords: [4.59978, -74.08878] },
    ],
    portales: [],
  },
  {
    id: "nqs-sur",
    nombre: "NQS Sur",
    color: "#009CDE",
    estaciones: [
      { nombre: "Comuneros", coords: [4.6042, -74.09992] },
      { nombre: "Santa Isabel", coords: [4.60159, -74.10276] },
      { nombre: "SENA", coords: [4.59732, -74.11077] },
      { nombre: "NQS Calle 30 Sur", coords: [4.59474, -74.11812] },
      { nombre: "Calle 38A Sur - Centro Mayor", coords: [4.59379, -74.12378] },
      { nombre: "General Santander", coords: [4.59356, -74.1296] },
      { nombre: "Alquería", coords: [4.59426, -74.13428] },
      { nombre: "Venecia", coords: [4.59555, -74.14285] },
      { nombre: "Sevillana", coords: [4.59511, -74.1475] },
      { nombre: "C.C. Paseo Villa del Río - Madelena", coords: [4.59628, -74.15699] },
      { nombre: "Perdomo", coords: [4.59578, -74.16496] },
      { nombre: "Portal Sur", coords: [4.59735, -74.16933] },
      { nombre: "Bosa", coords: [4.59683, -74.18127] },
      { nombre: "La Despensa", coords: [4.59458, -74.18821] },
      { nombre: "León XIII", coords: [4.5922, -74.19316] },
      { nombre: "Terreros - H. Cardiovascular", coords: [4.58896, -74.19944] },
      { nombre: "San Mateo", coords: [4.58624, -74.20483] },
    ],
    portales: [{ nombre: "Portal Sur", coords: [4.59735, -74.16933] }],
  },
  {
    id: "caracas-sur",
    nombre: "Caracas Sur",
    color: "#F18500",
    estaciones: [
      { nombre: "Hospital", coords: [4.5952, -74.08628] },
      { nombre: "Hortúa", coords: [4.59076, -74.09033] },
      { nombre: "Nariño", coords: [4.58639, -74.09384] },
      { nombre: "Fucha", coords: [4.58288, -74.09956] },
      { nombre: "Restrepo", coords: [4.58201, -74.10138] },
      { nombre: "Olaya", coords: [4.57883, -74.10755] },
      { nombre: "Quiroga", coords: [4.5768, -74.11439] },
      { nombre: "Calle 40 Sur", coords: [4.5758, -74.12006] },
      { nombre: "Santa Lucía", coords: [4.57092, -74.12479] },
      { nombre: "Portal Tunal", coords: [4.57091, -74.13957] },
      { nombre: "Biblioteca", coords: [4.57037, -74.13046] },
      { nombre: "Parque", coords: [4.56844, -74.13554] },
      { nombre: "Socorro", coords: [4.56467, -74.12558] },
      { nombre: "Consuelo", coords: [4.56009, -74.12384] },
      { nombre: "Molinos", coords: [4.55742, -74.1218] },
      { nombre: "Danubio", coords: [4.54636, -74.12097] },
      { nombre: "Portal Usme", coords: [4.53184, -74.11945] },
    ],
    portales: [
      { nombre: "Portal Tunal", coords: [4.57091, -74.13957] },
      { nombre: "Portal Usme", coords: [4.53184, -74.11945] },
    ],
  },
  {
    id: "calle-80",
    nombre: "Calle 80",
    color: "#8064A9",
    estaciones: [
      { nombre: "Portal 80", coords: [4.70967, -74.11069] },
      { nombre: "Quirigua", coords: [4.70674, -74.10884] },
      { nombre: "Carrera 90", coords: [4.70467, -74.10468] },
      { nombre: "Avenida Cali", coords: [4.70241, -74.10025] },
      { nombre: "Granja - Carrera 77", coords: [4.69871, -74.09538] },
      { nombre: "Minuto de Dios", coords: [4.69665, -74.0916] },
      { nombre: "Boyacá", coords: [4.69394, -74.0872] },
      { nombre: "Ferias", coords: [4.69093, -74.08466] },
      { nombre: "Avenida 68", coords: [4.68578, -74.08058] },
      { nombre: "Carrera 53", coords: [4.68177, -74.07742] },
      { nombre: "Carrera 47", coords: [4.67796, -74.07365] },
      { nombre: "Escuela Militar", coords: [4.67555, -74.06985] },
      { nombre: "Polo - Fincomercio", coords: [4.67073, -74.06484] },
    ],
    portales: [{ nombre: "Portal 80", coords: [4.70967, -74.11069] }],
  },
  {
    id: "americas",
    nombre: "Av. Américas",
    color: "#DC0814",
    estaciones: [
      { nombre: "Portal Américas", coords: [4.62957, -74.17322] },
      { nombre: "Patio Bonito", coords: [4.63322, -74.16472] },
      { nombre: "Biblioteca Tintal", coords: [4.638, -74.15939] },
      { nombre: "Transversal 86", coords: [4.63416, -74.15196] },
      { nombre: "Banderas", coords: [4.63133, -74.14566] },
      { nombre: "Mandalay", coords: [4.63087, -74.14141] },
      { nombre: "Av. Américas - Av. Boyacá", coords: [4.63011, -74.1342] },
      { nombre: "Marsella", coords: [4.62968, -74.13039] },
      { nombre: "Pradera - Plaza Central", coords: [4.6285, -74.11861] },
      { nombre: "Distrito Grafiti", coords: [4.62789, -74.11167] },
      { nombre: "Puente Aranda", coords: [4.62578, -74.10481] },
      { nombre: "Carrera 43 - Comapan", coords: [4.62287, -74.10154] },
      { nombre: "Zona Industrial", coords: [4.62022, -74.09862] },
      { nombre: "CDS Carrera 32", coords: [4.6161, -74.09396] },
      { nombre: "Ricaurte", coords: [4.61293, -74.09042] },
      { nombre: "San Facón - Carrera 22", coords: [4.60964, -74.0867] },
      { nombre: "De La Sabana", coords: [4.60533, -74.08184] },
      { nombre: "Avenida Jiménez", coords: [4.60296, -74.07903] },
    ],
    portales: [{ nombre: "Portal Américas", coords: [4.62957, -74.17322] }],
  },
  {
    id: "eje-ambiental",
    nombre: "Eje Ambiental",
    color: "#E1A2AC",
    estaciones: [
      { nombre: "Museo del Oro", coords: [4.60118, -74.07293] },
      { nombre: "Las Aguas - Centro Colombo Americano", coords: [4.60246, -74.0684] },
    ],
    portales: [],
  },
  {
    id: "calle-26",
    nombre: "Calle 26",
    color: "#D5B079",
    estaciones: [
      { nombre: "Portal El Dorado", coords: [4.68208, -74.12169] },
      { nombre: "Modelia", coords: [4.67515, -74.11723] },
      { nombre: "Normandía", coords: [4.66882, -74.11317] },
      { nombre: "Av. Rojas - Unisalesiana", coords: [4.66222, -74.10894] },
      { nombre: "El Tiempo - Cámara de Comercio de Bogotá", coords: [4.65701, -74.10566] },
      { nombre: "Salitre El Greco - Vive Claro", coords: [4.65085, -74.10168] },
      { nombre: "CAN - British Council", coords: [4.64705, -74.0992] },
      { nombre: "Gobernación", coords: [4.64251, -74.09634] },
      { nombre: "Quinta Paredes", coords: [4.63745, -74.09308] },
      { nombre: "Corferias", coords: [4.63435, -74.08983] },
      { nombre: "Ciudad Universitaria", coords: [4.63089, -74.08358] },
      { nombre: "Concejo de Bogotá", coords: [4.62601, -74.08038] },
      { nombre: "Centro Memoria", coords: [4.62121, -74.07688] },
      { nombre: "Universidades", coords: [4.60488, -74.06711] },
    ],
    portales: [{ nombre: "Portal El Dorado", coords: [4.68208, -74.12169] }],
  },
];

export const troncales: TroncalRoute[] = troncalesRaw.map((t) => ({
  ...t,
  coords: t.estaciones.map((e) => e.coords),
}));
