-- ============================================================================
-- PedidosPizza — Datos semilla (sede piloto Facatativá)
-- Ejecutar DESPUÉS de schema.sql.
-- Precios en COP (enteros). Solo la sede piloto por ahora.
-- ============================================================================

-- 1) SEDE ---------------------------------------------------------------------
insert into public.locations
  (id, name, whatsapp, phone, nequi_daviplata, hours_text, open_hour, close_hour, orders_paused, base_delivery_fee, min_order)
values
  ('facatativa-piloto', 'Facatativá (sede piloto)', '3124543390', '6018439790',
   '3115044295', 'Lunes a domingo, 1:00 p.m. - 10:00 p.m.', 13, 22, false, 4000, 0)
on conflict (id) do update set
  name = excluded.name,
  whatsapp = excluded.whatsapp,
  phone = excluded.phone,
  nequi_daviplata = excluded.nequi_daviplata;

-- 2) PUEBLOS CUBIERTOS (zonas de domicilio) -----------------------------------
--    Facatativá = pueblo base, tarifa base $4.000.
--    Para los pueblos: $4.000 + $1.000/km (km desde las afueras de Facatativá).
insert into public.delivery_zones (location_id, name, km, delivery_fee, is_home_town, sort_order)
values
  ('facatativa-piloto', 'Facatativá', 0,    4000,  true,  0),
  ('facatativa-piloto', 'El Rosal',   13.6, 17600, false, 1),
  ('facatativa-piloto', 'Bojacá',     12.5, 16500, false, 2),
  ('facatativa-piloto', 'Albán',      16,   20000, false, 3)
on conflict (location_id, name) do update set
  km = excluded.km,
  delivery_fee = excluded.delivery_fee,
  is_home_town = excluded.is_home_town,
  sort_order = excluded.sort_order;

-- 3) CATEGORÍAS ---------------------------------------------------------------
insert into public.categories (id, name, note, sort_order) values
  ('pizzas',        'Pizzas',             null, 0),
  ('hamburguesas',  'Hamburguesas',       null, 1),
  ('perros',        'Perros calientes',   null, 2),
  ('pastas',        'Pastas',             null, 3),
  ('especiales',    'Especiales',         'Acompañados de papa a la francesa y ensalada', 4),
  ('otros',         'Especiales y otros', null, 5),
  ('bebidas',       'Bebidas',            null, 6)
on conflict (id) do update set name = excluded.name, note = excluded.note, sort_order = excluded.sort_order;

-- 4) SABORES DE PIZZA ---------------------------------------------------------
insert into public.flavors (location_id, category_id, name, sort_order) values
  ('facatativa-piloto', 'pizzas', 'Hawaiana', 0),
  ('facatativa-piloto', 'pizzas', 'Pollo con champiñones', 1),
  ('facatativa-piloto', 'pizzas', 'Carnes', 2),
  ('facatativa-piloto', 'pizzas', 'Mexicana', 3),
  ('facatativa-piloto', 'pizzas', 'Napolitana', 4),
  ('facatativa-piloto', 'pizzas', 'Vegetariana', 5),
  ('facatativa-piloto', 'pizzas', 'Tropical', 6),
  ('facatativa-piloto', 'pizzas', 'Bocadillo con queso', 7),
  ('facatativa-piloto', 'pizzas', 'Criolla', 8)
on conflict (location_id, category_id, name) do nothing;

-- 5) PRODUCTO PIZZA + TAMAÑOS -------------------------------------------------
-- La categoría Pizzas se modela como un solo "producto" tipo pizza con tamaños.
insert into public.products
  (location_id, category_id, slug, name, product_type, price, sort_order)
values
  ('facatativa-piloto', 'pizzas', 'pizza', 'Pizza', 'pizza', null, 0)
on conflict (location_id, slug) do nothing;

insert into public.product_sizes (product_id, slug, name, portions, price, max_flavors, sort_order)
select p.id, v.slug, v.name, v.portions, v.price, v.max_flavors, v.sort_order
from public.products p
cross join (values
  ('porcion',     'Porción individual', 1,    10000, 1, 0),
  ('junior',      'Junior (1 sabor)',   null, 45000, 1, 1),
  ('pequena',     'Pequeña',            6,    57000, 3, 2),
  ('mediana',     'Mediana',            8,    76000, 3, 3),
  ('extra-large', 'Extra Large',        10,   95000, 3, 4)
) as v(slug, name, portions, price, max_flavors, sort_order)
where p.location_id = 'facatativa-piloto' and p.slug = 'pizza'
on conflict (product_id, slug) do update set
  price = excluded.price, max_flavors = excluded.max_flavors,
  portions = excluded.portions, name = excluded.name;

-- 6) HAMBURGUESAS -------------------------------------------------------------
insert into public.products
  (location_id, category_id, slug, name, description, product_type, price, requires_drink_choice, drink_options, sort_order)
values
  ('facatativa-piloto','hamburguesas','hamb-sencilla','Hamburguesa Sencilla', null, 'simple', 15000, false, '{}', 0),
  ('facatativa-piloto','hamburguesas','hamb-especial','Hamburguesa Especial','Carne, pollo y champiñones en salsa showy','simple',16000,false,'{}',1),
  ('facatativa-piloto','hamburguesas','hamb-noventa-artesanal','Noventa Grados Artesanal','Pollo, champiñones, queso, salsas, papa fosforito y tocineta','simple',18000,false,'{}',2),
  ('facatativa-piloto','hamburguesas','combo-burguer','Combo Burguer','Hamburguesa sencilla + papa francesa + gaseosa 250 ml','combo',23500,true,'{"Coca-Cola 250 ml","Quatro 250 ml","Sprite 250 ml"}',3),
  ('facatativa-piloto','hamburguesas','combo-hamb-90','Combo Hamburguesa 90°','Hamburguesa especial + papa francesa + gaseosa 250 ml','combo',24500,true,'{"Coca-Cola 250 ml","Quatro 250 ml","Sprite 250 ml"}',4),
  ('facatativa-piloto','hamburguesas','combo-artesanal','Combo Artesanal','Hamburguesa artesanal + papa francesa + gaseosa 250 ml','combo',26500,true,'{"Coca-Cola 250 ml","Quatro 250 ml","Sprite 250 ml"}',5)
on conflict (location_id, slug) do update set price = excluded.price, name = excluded.name, description = excluded.description;

-- 7) PERROS CALIENTES ---------------------------------------------------------
insert into public.products
  (location_id, category_id, slug, name, description, product_type, price, requires_drink_choice, drink_options, sort_order)
values
  ('facatativa-piloto','perros','perro-sencillo','Perro Sencillo', null, 'simple', 13000, false, '{}', 0),
  ('facatativa-piloto','perros','perro-especial','Perro Especial','Salchicha americana, queso y papas chips','simple',15500,false,'{}',1),
  ('facatativa-piloto','perros','combo-perro','Combo Perro','Perro sencillo + papa francesa + gaseosa 250 ml','combo',22500,true,'{"Coca-Cola 250 ml","Quatro 250 ml","Sprite 250 ml"}',2),
  ('facatativa-piloto','perros','combo-perro-90','Combo Perro 90°','Perro especial + papa francesa + gaseosa 250 ml','combo',25500,true,'{"Coca-Cola 250 ml","Quatro 250 ml","Sprite 250 ml"}',3)
on conflict (location_id, slug) do update set price = excluded.price, name = excluded.name, description = excluded.description;

-- 8) PASTAS -------------------------------------------------------------------
insert into public.products
  (location_id, category_id, slug, name, description, product_type, price, sort_order)
values
  ('facatativa-piloto','pastas','lasagna-especial','Lasagna Especial','Pollo, champiñones, salsa boloñesa, queso doble crema y parmesano','simple',21500,0),
  ('facatativa-piloto','pastas','espagueti-pollo','Espagueti con pollo','Pollo, champiñones, salsa boloñesa, queso doble crema y parmesano','simple',21500,1)
on conflict (location_id, slug) do update set price = excluded.price, name = excluded.name, description = excluded.description;

-- 9) ESPECIALES ---------------------------------------------------------------
insert into public.products
  (location_id, category_id, slug, name, product_type, price, sort_order)
values
  ('facatativa-piloto','especiales','churrasco','Churrasco','simple',41000,0),
  ('facatativa-piloto','especiales','pechuga-gratinada','Pechuga gratinada','simple',38000,1),
  ('facatativa-piloto','especiales','costillitas-bbq','Costillitas BBQ','simple',38000,2)
on conflict (location_id, slug) do update set price = excluded.price, name = excluded.name;

-- 10) ESPECIALES Y OTROS ------------------------------------------------------
insert into public.products
  (location_id, category_id, slug, name, description, product_type, price, sort_order)
values
  ('facatativa-piloto','otros','salchipapa-sencillo','Salchipapa Sencillo', null, 'simple', 12000, 0),
  ('facatativa-piloto','otros','salchipapa-especial','Salchipapa Especial', null, 'simple', 18000, 1),
  ('facatativa-piloto','otros','suizo','Suizo','Salchicha grande de unos 30 cm de largo y 3 cm de ancho','simple',24500,2),
  ('facatativa-piloto','otros','porcion-papa','Porción de papa', null, 'simple', 7500, 3)
on conflict (location_id, slug) do update set price = excluded.price, name = excluded.name, description = excluded.description;

-- 11) BEBIDAS -----------------------------------------------------------------
-- Gaseosas (250/400/1.5L) dejan elegir sabor -> product_type 'drink_choice'.
-- Cervezas marcadas como alcohol.
insert into public.products
  (location_id, category_id, slug, name, product_type, price, is_alcohol, requires_drink_choice, drink_options, sort_order)
values
  ('facatativa-piloto','bebidas','agua-300','Agua 300 ml','simple',3000,false,false,'{}',0),
  ('facatativa-piloto','bebidas','gaseosa-250','Gaseosa 250 ml','drink_choice',3500,false,true,'{"Coca-Cola","Quatro","Sprite"}',1),
  ('facatativa-piloto','bebidas','coca-cola-350','Coca-Cola 350 ml','simple',3700,false,false,'{}',2),
  ('facatativa-piloto','bebidas','jugo-hit-250','Jugo Hit 250 ml','simple',3700,false,false,'{}',3),
  ('facatativa-piloto','bebidas','jugo-hit-500','Jugo Hit 500 ml','simple',4500,false,false,'{}',4),
  ('facatativa-piloto','bebidas','jugo-soka-400','Jugo Soka 400 ml','simple',4500,false,false,'{}',5),
  ('facatativa-piloto','bebidas','pony-malta-330','Pony Malta 330 ml','simple',4500,false,false,'{}',6),
  ('facatativa-piloto','bebidas','gaseosa-400','Gaseosa 400 ml','drink_choice',4500,false,true,'{"Coca-Cola","Quatro","Sprite"}',7),
  ('facatativa-piloto','bebidas','gaseosa-1-5l','Gaseosa 1.5 L','drink_choice',7000,false,true,'{"Coca-Cola","Quatro","Sprite"}',8),
  ('facatativa-piloto','bebidas','cerveza-coronita-210','Cerveza Coronita 210 ml','simple',5000,true,false,'{}',9),
  ('facatativa-piloto','bebidas','cerveza-heineken-240','Cerveza Heineken 240 ml','simple',5000,true,false,'{}',10)
on conflict (location_id, slug) do update set price = excluded.price, name = excluded.name, is_alcohol = excluded.is_alcohol, drink_options = excluded.drink_options;

-- 12) STAFF (opcional de ejemplo) ---------------------------------------------
-- El dueño y la cocina se crean con el script de administración (ver README).
-- Repartidor de ejemplo con PIN (login simple):
insert into public.staff (location_id, name, role, pin, active)
values ('facatativa-piloto', 'Repartidor 1', 'driver', '1234', true)
on conflict do nothing;
