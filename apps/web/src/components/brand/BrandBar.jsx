import Image from "next/image";
import Link from "next/link";

function LogoBox({ children, variant = "dark" }) {
  const base =
    "h-20 flex items-center justify-center overflow-hidden rounded-xl border shadow-sm";
  const styles =
    variant === "dark"
      ? "border-white/10 bg-black/50"
      : "border-white/10 bg-white/5";

  return <div className={`${base} ${styles}`}>{children}</div>;
}

export default function BrandBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/acceso" className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {/* Iglesia */}
            <LogoBox variant="dark">
              <Image
                src="/brand/iglesia.jpg"
                alt="Conexión con el Cielo"
                width={112}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </LogoBox>

            <div className="h-7 w-px bg-white/10" />

            {/* ACCI */}
            <LogoBox variant="light">
              <Image
                src="/brand/acci.png"
                alt="ACCI Academy"
                width={140}
                height={56}
                className="h-[4.5rem] w-auto object-contain"
                priority
              />
            </LogoBox>
          </div>

          <div className="hidden md:block leading-tight">
            <div className="text-sm font-semibold text-white">ACCI Platform</div>
            <div className="text-xs text-slate-300">Escuela cristiana · LMS</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/acceso"
            className="text-xs text-slate-200 hover:text-white rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
          >
            Cambiar perfil
          </Link>
        </div>
      </div>
    </header>
  );
}
