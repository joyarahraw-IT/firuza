import { getMessages } from '@/lib/i18n/es';
import { pillarIcons } from './Icons';

export function Pillars() {
  const items = getMessages().pillars;
  return (
    <ul className="grid list-none gap-9 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => {
        const Icon = pillarIcons[p.icon];
        return (
          <li key={p.title}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-turq-tint text-turq-dark">
              <Icon />
            </span>
            <h3 className="mb-1.5 mt-3 text-xl">{p.title}</h3>
            <p className="text-[15px] text-muted">{p.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
