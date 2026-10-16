// LEGAL TEXTS: DRAFT, TO BE REVIEWED BY A GESTOR / LAWYER BEFORE THE SHOP GOES LIVE.
// They describe how this shop works today (no online payment, made-to-order pieces, rugs already woven). Any text can be
// replaced from the admin (Ajustes → Datos y textos legales); a non-empty text there overrides the default below.
import { formatEur } from '@/lib/format';
import { BIZUM, PAY_METHODS } from '@/lib/pay-methods';
import type { ShippingRates } from '@/lib/shipping';

export type Section = { h?: string; p: string[]; list?: string[] };
export type LegalCtx = {
  name: string;
  nie: string;
  email: string;
  address: string;
  whatsapp: string;
  rates: ShippingRates;
  ship: { es_min: number; es_max: number; eu_min: number; eu_max: number };
  rugDays: { min: number; max: number };
  payment: string[];
};
export type LegalKey = 'aviso-legal' | 'privacidad' | 'condiciones' | 'envios' | 'devoluciones' | 'cookies';

export const LEGAL_META: Record<LegalKey, { title: string; description: string; setting: string }> = {
  'aviso-legal': { title: 'Aviso legal', description: 'Datos del titular de Firuza y condiciones de uso de la web.', setting: 'aviso' },
  privacidad: { title: 'Política de privacidad', description: 'Cómo tratamos tus datos personales en Firuza (RGPD).', setting: 'privacidad' },
  condiciones: { title: 'Condiciones de venta', description: 'Cómo se hace un pedido en Firuza, plazos, pago y garantías.', setting: 'condiciones' },
  envios: { title: 'Envíos', description: 'Zonas, precios y plazos de envío de Firuza.', setting: 'envios' },
  devoluciones: { title: 'Devoluciones', description: 'Derecho de desistimiento, excepciones y garantía.', setting: 'devoluciones' },
  cookies: { title: 'Cookies', description: 'Qué almacenamiento técnico usa esta web.', setting: 'cookies' },
};

const price = (c: number) => (c === 0 ? 'gratis' : formatEur(c));
const or = (v: string, fallback: string) => (v && v.trim() ? v.trim() : fallback);

export function defaultSections(key: LegalKey, c: LegalCtx): Section[] {
  const address = or(c.address, '[pendiente]');
  const payment = c.payment.length ? c.payment.join(' o ') : PAY_METHODS;

  switch (key) {
    case 'aviso-legal':
      return [
        { h: 'Titular del sitio web', p: ['En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI), se informa de los datos del titular:'],
          list: [`Titular: ${c.name}`, `NIE: ${or(c.nie, '[pendiente]')}`, `Domicilio: ${address}`, `Email de contacto: ${c.email}`, `WhatsApp: +${c.whatsapp}`, 'Actividad: venta de artesanía hecha a mano (tejidos, bisutería y alfombras).'] },
        { h: 'Quién vende y quién hace las piezas', p: [`La tienda Firuza es titularidad de ${c.name}, que es la vendedora, la titular de la cuenta de cobro (Stripe) y la responsable de los pedidos. Las piezas las elabora a mano la artesana Nombre Apellido.`] },
        { h: 'Objeto y uso de la web', p: ['Esta web permite conocer y encargar las piezas de Firuza. El acceso es gratuito. Al usarla aceptas este aviso legal; si no estás de acuerdo, te pedimos que no la utilices.', 'Te comprometes a hacer un uso adecuado de la web, sin realizar actividades ilícitas ni que dañen su funcionamiento.'] },
        { h: 'Propiedad intelectual', p: ['Los textos, fotografías, diseños y demás contenidos de la web pertenecen al titular o se usan con autorización. No se pueden reproducir, distribuir ni modificar sin permiso previo y por escrito.'] },
        { h: 'Responsabilidad', p: ['Hacemos lo posible por que la información sea exacta y esté actualizada. Las fotografías de las piezas hechas a mano son orientativas: el color y los detalles pueden variar ligeramente, porque cada pieza se hace a mano.', 'No nos hacemos responsables de interrupciones del servicio ni de los contenidos de webs de terceros a las que se pueda enlazar.'] },
        { h: 'Legislación y jurisdicción', p: ['Este aviso se rige por la legislación española. Si eres consumidor, podrás acudir a los juzgados y tribunales de tu domicilio.'] },
      ];
    case 'privacidad':
      return [
        { h: 'Responsable del tratamiento', p: ['El responsable de tus datos personales es la titular de la tienda:'], list: [c.name, `Domicilio: ${address}`, `Email: ${c.email}`] },
        { h: 'Qué datos tratamos y para qué', p: ['Tratamos solo los datos necesarios para cada finalidad:'],
          list: ['Pedidos: nombre, email, teléfono, dirección de envío, notas y contenido del pedido. Para preparar, enviar y gestionar tu pedido y cobrarlo. El pago lo procesa Stripe, que recibe tu nombre, email e importe; nosotros no guardamos los datos de tu tarjeta. Base legal: ejecución del contrato.',
            'Cuenta de cliente (opcional): nombre, email, teléfono, direcciones y contraseña (guardada de forma cifrada). Para que veas tus pedidos y guardes tus datos. Base legal: ejecución del contrato / tu consentimiento.',
            'Formulario de contacto: nombre, email, teléfono (opcional) y mensaje. Para responderte. Base legal: tu consentimiento.',
            'Opiniones: tu nombre de pila, la valoración y el texto, cuando decides escribir una opinión sobre un pedido entregado. Base legal: tu consentimiento.',
            'Obligaciones legales: conservamos los datos de los pedidos el tiempo que exigen las normas fiscales y mercantiles. Base legal: obligación legal.'] },
        { h: 'Cuánto tiempo los conservamos', p: ['Los datos de los pedidos, durante los plazos legales de conservación (fiscales y mercantiles). Los mensajes de contacto, hasta atender tu consulta y un plazo razonable después. Los datos de tu cuenta, mientras no la elimines.'] },
        { h: 'A quién se los comunicamos', p: ['No vendemos tus datos. Pueden acceder a ellos, solo para prestarnos el servicio, proveedores tecnológicos (alojamiento, base de datos y envío de correo electrónico) y empresas de transporte, y, si decides escribirnos por WhatsApp, la propia aplicación de mensajería. Cuando intervienen proveedores fuera del Espacio Económico Europeo, se exigen garantías adecuadas.'] },
        { h: 'Tus derechos', p: ['Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a ' + c.email + '. Si tienes cuenta, puedes descargar tus datos y eliminar tu cuenta tú mismo desde «Mis datos».', 'Si consideras que no tratamos tus datos correctamente, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).'] },
        { h: 'Menores', p: ['Esta web no está dirigida a menores de 14 años. Si eres menor, pide a tu madre, padre o tutor que haga el pedido.'] },
      ];
    case 'condiciones':
      return [
        { h: 'Quién vende', p: [`Las piezas las vende ${c.name}, titular de la tienda Firuza (datos completos en el Aviso legal). Las elabora a mano la artesana Nombre Apellido.`] },
        { h: 'Cómo funciona un pedido', p: ['1. Eliges tus piezas y las añades al pedido. 2. Rellenas tus datos de entrega y pagas con ' + PAY_METHODS + '. 3. Recibes la confirmación por email. 4. Hacemos o preparamos tu pieza y te la enviamos.', 'En alfombras y kilims, enviar el pedido no implica ningún pago hasta que confirmamos contigo el envío y recibes el enlace de pago.'] },
        { h: 'Precios', p: ['Los precios se indican en euros. Cuando eliges un material, una medida u otra opción, el precio se actualiza en la página del producto. El precio que ves al enviar el pedido es el que se aplica a ese pedido, aunque después cambiemos los precios de la tienda.'] },
        { h: 'Pago', p: [`El pago se hace online, de forma segura, con tarjeta (incluidos Apple Pay y Google Pay)${BIZUM ? ' o Bizum' : ''}, a través de Stripe: no vemos ni guardamos los datos de tu tarjeta. Aceptamos ${payment}. En alfombras y kilims, y en envíos a Baleares, Canarias, Ceuta y Melilla, primero confirmamos contigo los gastos de envío y te enviamos un enlace de pago. No empezamos a hacer la pieza hasta recibir el pago.`] },
        { h: 'Plazos', p: ['Las piezas de tejido, bisutería y crochet se hacen después de tu pedido: cada producto indica su tiempo de elaboración (entre 1 y 10 días) y a eso se suma el envío. Verás una fecha estimada de llegada, que es orientativa.', `Las alfombras y kilims ya están tejidos: no se hacen bajo pedido y llegan en ${c.rugDays.min}–${c.rugDays.max} días.`] },
        { h: 'Piezas hechas a mano', p: ['Cada pieza es artesanal. Pequeñas diferencias de tono, tamaño o acabado respecto a las fotografías son normales y forman parte de lo hecho a mano.'] },
        { h: 'Desistimiento y garantía', p: ['El derecho de desistimiento, sus excepciones y la garantía legal están explicados en la página de Devoluciones. En particular, las piezas hechas a tu medida o en el color y la medida que eliges no tienen derecho de desistimiento (art. 103 del Real Decreto Legislativo 1/2007, TRLGDCU), salvo defecto.'] },
        { h: 'Atención al cliente y reclamaciones', p: [`Puedes escribirnos a ${c.email} o por WhatsApp. Si no estás conforme, puedes acudir a las vías de resolución de conflictos de consumo que correspondan, incluida la plataforma europea de resolución de litigios en línea (ec.europa.eu/consumers/odr).`] },
        { h: 'Legislación aplicable', p: ['Estas condiciones se rigen por la legislación española.'] },
      ];
    case 'envios':
      return [
        { h: 'Zonas y precios', p: ['El precio del envío es único por pedido y se calcula con tu país y tu código postal al enviar el pedido:'],
          list: [`Comunidad de Madrid: ${price(c.rates.madrid_cents)}.`, `Resto de España peninsular: ${price(c.rates.spain_cents)}.`, `Resto de la Unión Europea: ${price(c.rates.eu_cents)}.`, `Islas Baleares, Canarias, Ceuta y Melilla: ${c.rates.consult_label.toLowerCase()}.`] },
        { h: 'Alfombras y kilims', p: [c.rates.rug_label + '. No se incluyen en el envío gratuito ni en la tarifa de las demás piezas, ni siquiera en la Comunidad de Madrid.'] },
        { h: 'Plazos', p: [`Las piezas hechas bajo pedido se envían cuando están terminadas. El envío tarda ${c.ship.es_min}–${c.ship.es_max} días laborables en España peninsular y ${c.ship.eu_min}–${c.ship.eu_max} días laborables en el resto de la UE. Esa duración se suma al tiempo de elaboración de cada pieza.`, `Las alfombras y kilims llegan en ${c.rugDays.min}–${c.rugDays.max} días.`] },
        { h: 'Seguimiento e incidencias', p: ['Te avisaremos cuando salga tu pedido y, si hay número de seguimiento, te lo daremos. Si el paquete llega dañado o no llega, escríbenos cuanto antes y lo resolvemos.'] },
      ];
    case 'devoluciones':
      return [
        { h: 'Derecho de desistimiento (14 días)', p: ['Como consumidor, tienes derecho a desistir de la compra en 14 días naturales desde que recibes el producto, sin necesidad de justificarlo, salvo en los casos excluidos que se indican abajo.', 'Para ejercerlo, escríbenos a ' + c.email + ' indicando tu número de pedido. Devuelve la pieza sin usar y en su estado original. Los gastos de devolución corren de tu cuenta. Te reembolsamos el importe en un máximo de 14 días desde que recibimos la devolución.'] },
        { h: 'Alfombras y kilims', p: ['Las alfombras y kilims ya tejidos pueden devolverse en los 14 días siguientes a recibirlos, sin usar y en su estado original. Escríbenos antes de enviarlos.'] },
        { h: 'Piezas excluidas del desistimiento', p: ['Según el artículo 103 del TRLGDCU, no hay derecho de desistimiento en los bienes confeccionados conforme a las especificaciones del consumidor o claramente personalizados. Es el caso de las piezas que hacemos después de tu pedido en el color, el material o la medida que eliges (tejidos, crochet, collares, pulseras y pendientes).'] },
        { h: 'Garantía legal y defectos', p: ['Aunque la pieza esté excluida del desistimiento, tienes derecho a la garantía legal de conformidad si llega con algún defecto o no es como se acordó. Escríbenos, con fotos si puedes, y la reparamos, la sustituimos o te devolvemos el dinero, según proceda.'] },
      ];
    case 'cookies':
      return [
        { h: 'Qué usamos', p: ['Esta web solo usa almacenamiento técnico imprescindible para funcionar. No usamos cookies de analítica, de publicidad ni de seguimiento, y por eso no te mostramos un banner de cookies.'],
          list: ['Tu pedido (la «bolsa»): se guarda en el almacenamiento local de tu navegador para recordar lo que has añadido. No se envía a nadie hasta que envías el pedido.', 'Sesión de cliente: si inicias sesión, se guardan cookies técnicas para mantenerla abierta. Se eliminan al cerrar sesión.', 'Resumen del último pedido: se guarda unos minutos en la sesión del navegador para mostrarte la confirmación.'] },
        { h: 'Si cambia algo', p: ['Si en el futuro añadimos cookies que no sean imprescindibles (por ejemplo, de analítica), actualizaremos esta página y te pediremos tu consentimiento antes de usarlas.', 'Puedes borrar el almacenamiento de tu navegador cuando quieras desde sus ajustes.'] },
      ];
  }
}

/** Text typed in the admin: "## Título" starts a section, blank lines separate paragraphs. */
export function parseCustom(text: string): Section[] {
  const sections: Section[] = [];
  let cur: Section = { p: [] };
  for (const block of text.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (b.startsWith('## ')) {
      if (cur.h || cur.p.length) sections.push(cur);
      const [first, ...rest] = b.split('\n');
      cur = { h: first.slice(3).trim(), p: rest.join('\n').trim() ? [rest.join('\n').trim()] : [] };
    } else cur.p.push(b);
  }
  if (cur.h || cur.p.length) sections.push(cur);
  return sections;
}
