import Image from "next/image";

/**
 * Marca secundaria fija (arriba-derecha) integrada al layout:
 * - No tapa contenido
 * - Fondo negro del JPG se “disuelve” con blend
 * - Glow azul ACCI
 */
export default function ChurchSideMark() {
  return (
    <div className="fixed top-6 right-6 z-40 pointer-events-none select-none">
      <div className="relative">
        {/* aura */}
        <div className="absolute -inset-10 blur-3xl opacity-60 bg-gradient-to-br from-sky-500/20 via-blue-500/12 to-transparent" />

        {/* contenedor sutil (sin cuadro duro) */}
        <div className="relative rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            {/* logo con blend: el negro “se pierde” y queda blanco integrado */}
            <div className="relative h-10 w-28 md:h-11 md:w-32 mix-blend-screen opacity-90">
              <Image
                src="/brand/iglesia.jpg"
                alt="Conexión con el Cielo"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* texto discreto */}
            <div className="hidden md:block leading-tight">
              <div className="text-xs font-semibold text-white">Conexión con el Cielo</div>
              <div className="text-[11px] text-slate-300">Iglesia</div>
            </div>
          </div>

          {/* borde inferior suave */}
          <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
    </div>
  );
}
