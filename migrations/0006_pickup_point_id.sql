-- ID výdajného miesta z mapy Packety (prázdne, ak ho zákazník vpísal ručne).
ALTER TABLE orders ADD COLUMN pickup_point_id TEXT NOT NULL DEFAULT '';
