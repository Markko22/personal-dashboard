export const metadata = {
  title: "Accesso privato richiesto",
};

export default function AccessoRichiestoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-lg">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
          Area privata
        </p>
        <h1 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
          Serve il link privato
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
          Per aprire le dashboard personali devi usare il link privato che ti è
          stato condiviso. Visita quel link una volta: verrà impostato un
          accesso valido per 30 giorni.
        </p>
        <p className="mt-6 text-xs text-[var(--muted)]">
          Se non hai il link, contatta il proprietario della dashboard.
        </p>
      </div>
    </div>
  );
}
