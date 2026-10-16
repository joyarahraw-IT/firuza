export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center px-5 py-12">
      <p className="mb-6 font-serif text-3xl">Firuza <span className="label ml-2 text-[11px] text-muted">Administración</span></p>
      <div className="border border-line bg-cotton p-7">{children}</div>
    </main>
  );
}
