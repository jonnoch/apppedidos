// Configuración de la sede piloto. En v1 servimos una sola ubicación, pero el
// modelo de datos ya es multi-sede: todo cuelga de este location_id.
export const LOCATION_ID =
  process.env.NEXT_PUBLIC_LOCATION_ID || "facatativa-piloto";
