-- Firuza · 0004 categories and settings (everything editable later in /admin)

insert into public.categories (slug, name, blurb, sort_order) values
  ('tejidos-crochet', 'Tejidos y crochet', 'Crochet y macramé hechos a mano.', 1),
  ('collares',        'Collares',          'Collares de cuentas, perlas y cristal.', 2),
  ('pulseras',        'Pulseras',          'Pulseras de cuentas y perlas.', 3),
  ('pendientes',      'Pendientes',        'Pendientes de cuentas, por pares.', 4),
  ('alfombras-kilims','Alfombras y kilims','Alfombras y kilims ya tejidos.', 5)
on conflict (slug) do nothing;

insert into public.settings (key, value, is_public) values
  ('brand',        '"Firuza"', true),
  ('announcement', '"Envío a toda la UE · Pagas al confirmar tu pedido · Piezas hechas a mano"', true),
  ('contact',      '{"email":"contacto@example.com","whatsapp":"34600000000","instagram":null}', true),
  ('shipping',     '{"es_min":2,"es_max":4,"eu_min":4,"eu_max":7,"text":"Las piezas hechas bajo pedido se envían en cuanto están terminadas. Plazo de envío: 2–4 días laborables en España peninsular y 4–7 días en el resto de la UE."}', true),
  ('rug_shipping', '{"min":15,"max":30,"text":"Las alfombras y kilims ya están tejidos: solo tienes que esperar a que lleguen (15–30 días)."}', true),
  ('payment',      '{"methods":["Bizum","Transferencia bancaria"],"text":"No pagas nada al enviar el pedido. Lo confirmamos por WhatsApp o email y acordamos el pago contigo. [CONFIRMAR métodos]"}', true),
  ('owner',        '{"name":"Nombre Apellido","show_age":false}', true),
  ('legal_identity','{"name":"Nombre Apellido","nie":"[NIE]","email":"contacto@example.com","address":"[CONFIRMAR domicilio]"}', true),
  ('rug_industrial', '{"sizes":["2 × 3 m","2,5 × 3,5 m","3 × 4 m","3 × 5 m","4 × 6 m","Otra medida (hasta 24 m²)"],"max_m2":24,"note":"Se fabrica a medida, desde 2 × 3 m hasta 24 m². Te enviamos el precio por WhatsApp antes de empezar."}', true),
  ('order_prefix', '"FZ"', false),
  ('show_vat',     'false', true)
on conflict (key) do nothing;
