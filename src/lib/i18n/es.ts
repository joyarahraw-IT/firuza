// Spanish (Spain) strings. To add English later: create en.ts with the same shape and pick it by locale in `getMessages`.
export const es = {
  brand: 'Firuza',
  tagline: 'Hecho a mano por Hafefa',
  announcement: 'Envío a toda la UE · Pago seguro con tarjeta o Bizum · Piezas hechas a mano',
  nav: {
    categories: 'Categorías',
    search: 'Buscar',
    account: 'Mi cuenta',
    bag: 'Bolsa',
    bagCount: (n: number) => `Bolsa, ${n} ${n === 1 ? 'artículo' : 'artículos'}`,
  },
  home: {
    heroTitle: 'Piezas hechas a mano, una a una',
    heroText: 'Collares, pulseras, pendientes y crochet que hacemos cuando lo pides, en tu color. Alfombras y kilims ya tejidos, listos para enviar.',
    heroCta: 'Ver collares',
    heroCta2: 'Escríbenos por WhatsApp',
    startWithCategory: 'Empieza por una categoría',
    novelties: 'Novedades',
  },
  pillars: [
    { icon: 'hand', title: 'Hecho a mano', text: 'Tejidos y bisutería hechos a mano en Madrid, uno a uno.' },
    { icon: 'calendar', title: 'Plazos claros', text: 'Ves cuánto tarda en hacerse y cuándo llega, antes de pedir.' },
    { icon: 'check', title: 'Pago seguro', text: 'Pagas con tarjeta en una página segura.' },
    { icon: 'chat', title: 'Trato directo', text: 'Hablas con quien hace tu pieza, por WhatsApp o email.' },
  ],
  pricing: { from: 'Desde', alsoAcrylic: 'también en acrílico', alsoAcrylicFrom: 'también en acrílico desde' },
  materials: { stone: 'Piedras, perlas y cristal', acrylic: 'Cuentas acrílicas' },
} as const;

export type Messages = typeof es;
export const getMessages = (_locale: 'es' = 'es'): Messages => es;
