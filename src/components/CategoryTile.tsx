import Image from 'next/image';
import Link from 'next/link';

/** Photo on top, category name below on cotton. No gradient over the image. */
export function CategoryTile({ href, name, src, alt = '' }: { href: string; name: string; src: string; alt?: string }) {
  return (
    <Link href={href} className="group block text-ink no-underline">
      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width:1024px) 18vw, (min-width:640px) 30vw, 48vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <h3 className="pt-3 text-[22px] group-hover:text-turq-dark">{name}</h3>
    </Link>
  );
}
