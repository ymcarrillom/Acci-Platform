import Image from 'next/image';

export default function CornerChurchMark() {
  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2 shadow-xl">
        <div className="relative h-9 w-28 overflow-hidden rounded-xl ring-1 ring-white/10">
          <Image
            src="/brand/iglesia.jpg"
            alt="Conexión con el Cielo"
            fill
            className="object-contain p-1 opacity-95"
            priority
          />
        </div>

        {/* Texto integrado: aparece en pantallas medianas+ o con hover */}
        <div className="hidden md:block">
          <div className="text-xs font-semibold text-white leading-tight">
            Conexión con el Cielo
          </div>
          <div className="text-[11px] text-slate-300">Iglesia</div>
        </div>

        {/* Mini glow sutil al hover (integración con fondo) */}
        <div className="pointer-events-none absolute -inset-10 opacity-0 group-hover:opacity-100 transition blur-2xl bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-transparent" />
      </div>
    </div>
  );
}
