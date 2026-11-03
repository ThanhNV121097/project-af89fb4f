CREATE TABLE products (
    id    text PRIMARY KEY,
    name  text NOT NULL,
    note  text NOT NULL,
    price numeric(12,2) NOT NULL CHECK (price > 0),
    image text NOT NULL DEFAULT '',
    added date NOT NULL,
    seq   bigserial
);

INSERT INTO products (id, name, note, price, image, added) VALUES
    ('kitchen-scale', 'Kitchen scale, 5kg', 'Mechanical, no battery. Reads in grams and ounces.', 46, '/images/products-scale.png', '2026-10-28'),
    ('skillet', 'Iron frying pan, 26cm', 'Pre-seasoned, oven to table. Heavy enough to hold its heat.', 88, '/images/pan.png', '2026-10-27'),
    ('stoneware-plate', 'Banded bowl, 14cm', 'Hand-painted bands on white earthenware. For breakfast or soup.', 26, '/images/products-stoneware-plate.png', '2026-10-26'),
    ('candy-jar', 'Sweet jar, 2 litre', 'Pressed glass with a ground stopper. For the counter.', 28, '/images/jar.png', '2026-10-24'),
    ('glass-jar', 'Clip-top jar, 1 litre', 'Thick glass with a rubber seal. For flour, coffee, anything dry.', 14, '/images/products-glass-jar.png', '2026-10-23'),
    ('candle-holder', 'Brass candle holder', 'Turned brass, weighted base. One dinner candle included.', 34, '/images/products-candle-holder.png', '2026-10-21'),
    ('tea-towel', 'Linen tea towel', 'Washed linen, 50 by 70cm. Soft from the first wash.', 18, '/images/products-tea-towel.png', '2026-10-20'),
    ('wooden-spoon', 'Beech cooking spoon', 'One piece of beech, 30cm. Safe on an enamelled pan.', 9, '/images/products-wooden-spoon.png', '2026-10-18'),
    ('porcelain-cup', 'Porcelain cup, 180ml', 'Thick-walled, keeps a short coffee hot to the last mouthful.', 18, '/images/mug.png', '2026-10-16'),
    ('saucepan', 'Steel saucepan, 2 litre', 'Stainless with a sandwich base. Lid sold with it.', 54, '/images/saucepan.png', '2026-10-14'),
    ('wine-glass', 'Wine glass, plain stem', 'Hand-blown, sold singly so a broken one is replaceable.', 12, '/images/carafe.png', '2026-10-11'),
    ('smoked-almonds', 'Smoked almonds, 200g', 'Salted, from the back counter. Refilled on Fridays.', 9, '/images/bowl.png', '2026-10-09');
