# PedidosPizza — Pizzería 90 grados

App web **mobile-first** para tomar pedidos a domicilio de **Pizzería 90 grados**.
Sede piloto: **Facatativá, Colombia**. Todo el texto está en español (Colombia),
los precios son enteros en COP (se muestran como `$32.000`) y la zona horaria de
referencia es **America/Bogota**.

Construida con **Next.js (App Router) + Supabase** (Postgres, Auth, Realtime),
pensada para desplegarse en **planes gratuitos** (Vercel + Supabase).

> **Multi-sede desde el día 1:** cada precio de producto, pedido y usuario del
> personal pertenece a un `location_id`, y los precios pueden variar por sede.
> La UI del piloto sirve una sola ubicación (`facatativa-piloto`).

---

## Pantallas

| Ruta | Quién | Qué hace |
|------|-------|----------|
| `/pedir` | Cliente (sin cuenta) | Menú por categorías, personalización (tamaños/sabores/gaseosa), carrito, checkout, tarifa de domicilio por pueblo, confirmación +18 si hay alcohol, consentimiento Habeas Data, y botón **Enviar por WhatsApp**. Bloquea pedidos fuera de horario o si el dueño pausó. |
| `/privacidad` | Público | Aviso de privacidad (Ley 1581 de 2012). |
| `/panel` | Cocina / Dueño (email + contraseña) | Lista **en tiempo real** de pedidos con alerta de sonido, flujo de estados de un toque y asignación de repartidor. |
| `/panel/menu` | Dueño | Agregar/editar/eliminar productos, precios, tamaños y sabores; marcar "agotado"; pausar pedidos; editar pueblos (km y tarifa). |
| `/panel/resumen` | Dueño | Resumen de pedidos, ventas, domicilios y pago (hoy y últimos 7 días). |
| `/repartidor` | Repartidor (PIN) | Sus pedidos en Listo/En camino, abrir en Google Maps, llamar al cliente y marcar entregado. |

---

## Puesta en marcha

### 1. Crear el proyecto de Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (plan Free).
2. En **SQL Editor**, ejecuta `supabase/schema.sql` (crea tablas, RLS, triggers y Realtime).
3. Luego ejecuta `supabase/seed.sql` (carga la sede piloto, el menú, los pueblos y un repartidor de ejemplo con PIN `1234`).
4. En **Settings → API** copia: `Project URL`, la clave `anon` y la clave `service_role`.

### 2. Variables de entorno
Copia `.env.example` a `.env.local` y completa:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # SOLO servidor, nunca en el cliente
NEXT_PUBLIC_LOCATION_ID=facatativa-piloto
```

### 3. Crear los usuarios del personal
El dueño y la cocina usan Supabase Auth (email + contraseña). Con las variables
de entorno cargadas en tu shell:

```bash
# Dueño
node scripts/create-staff.mjs dueno@90grados.co "MiClaveSegura" owner "Dueño 90°"
# Cocina
node scripts/create-staff.mjs cocina@90grados.co "OtraClave" kitchen "Cocina"
```

Los **repartidores** no necesitan email: se crean en la tabla `staff` con un PIN
(el seed ya trae `Repartidor 1` con PIN `1234`). Puedes agregar más con SQL:

```sql
insert into public.staff (location_id, name, role, pin, active)
values ('facatativa-piloto', 'Repartidor 2', 'driver', '5678', true);
```

### 4. Correr en local
```bash
npm install
npm run dev
```
Abre http://localhost:3000 → redirige a `/pedir`.

### 5. Desplegar en Vercel
1. Sube el repo a GitHub e **importa** en [vercel.com](https://vercel.com).
2. Carga las mismas variables de entorno en **Project Settings → Environment Variables**.
3. Deploy. El enlace público del cliente es `https://TU-APP.vercel.app/pedir`.

---

## Reglas de negocio clave (dónde viven)

- **Tarifa de domicilio** por pueblo: tabla `delivery_zones` (editable por el dueño).
  Facatativá `$4.000`; El Rosal `$17.600`; Bojacá `$16.500`; Albán `$20.000`.
  (`$4.000` base + `$1.000`/km para los pueblos cubiertos.)
- **Validaciones del pedido** (sabores por tamaño, gaseosa obligatoria en combos,
  confirmación +18 con alcohol, consentimiento): `src/lib/order-logic.ts`,
  aplicadas en la UI **y revalidadas en el servidor** en `src/app/api/orders/route.ts`.
- **Horario / pausa**: `src/lib/hours.ts` (America/Bogota, UTC-5, sin DST).
- **Precios recalculados en el servidor**: el API nunca confía en el precio del
  cliente; lee el precio vigente de la BD por sede.

## Seguridad (RLS)
- El catálogo es de **lectura pública** (la página del cliente no usa login).
- Los **pedidos** los inserta el servidor con `service_role` tras validar reglas.
- El **staff** solo puede leer/actualizar pedidos de **su** sede (políticas RLS).
- Solo el **dueño** puede modificar menú, precios y pueblos.

## Realtime
`src/app/panel/KitchenBoard.tsx` se suscribe a cambios de `orders` por sede.
Un pedido nuevo aparece en segundos y dispara una **alerta de sonido**
(Web Audio API; se activa con un toque por requisito de los navegadores móviles).

---

## Fuera de alcance de v1
Pagos en línea, cuentas de cliente, turnos, inventario, fidelización, panel
multi-sede, apps nativas y APIs de mapas/distancia.

<!-- deploy: re-trigger build tras volver el repositorio a público -->
