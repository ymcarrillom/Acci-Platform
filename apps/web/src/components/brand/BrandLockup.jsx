import Image from "next/image";

export default function BrandLockup({ variant = "hero", size = "md" }) {
  const isHero = variant === "hero";

  const sizeMap = {
    sm: {
      pad: "px-7 py-7 md:px-8 md:py-8",
      img: "h-18 w-[300px] md:h-20 md:w-[380px]",
      title: "text-lg md:text-xl",
      max: "max-w-xl",
      sep: "mt-4",
      titleMt: "mt-5",
    },
    md: {
      pad: "px-8 py-10",
      img: "h-22 w-[360px] md:h-24 md:w-[480px]",
      title: "text-2xl md:text-3xl",
      max: "max-w-2xl",
      sep: "mt-5",
      titleMt: "mt-6",
    },
    lg: {
      pad: "px-9 py-12",
      img: "h-24 w-[380px] md:h-28 md:w-[520px]",
      title: "text-2xl md:text-3xl",
      max: "max-w-2xl",
      sep: "mt-6",
      titleMt: "mt-7",
    },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center justify-center">
      <div className={`relative w-full ${s.max}`}>
        <div className="pointer-events-none absolute -inset-16 opacity-70 blur-3xl bg-gradient-to-r from-sky-500/25 via-blue-600/20 to-indigo-500/15" />

        <div className="relative rounded-[2rem] bg-slate-950/45 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/10" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/35 opacity-80" />

          <div className={`relative ${s.pad} flex flex-col items-center`}>
            <div className={`relative ${s.img} mt-1 drop-shadow-2xl`}>
              <Image
                src="/brand/acci.png"
                alt="ACCI Academy"
                fill
                sizes="(min-width: 768px) 480px, 360px"
                className="object-contain"
                priority
              />
            </div>

            <div className={`${s.sep} h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent`} />

            <h1 className={`${isHero ? s.title : "text-xl"} ${s.titleMt} font-extrabold text-white text-center`}>
              Portal Académico ACCI
            </h1>
            <p className="mt-2 text-sm text-slate-200/80 text-center">
              Academia de Crecimiento Cristiano Integral
            </p>

            {/* microcopy pro */}
            <p className="mt-3 text-[12px] text-slate-300/70 text-center">
              Cursos · Actividades semanales · Quizzes ilimitados · Seguimiento por rol
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-20 left-1/2 w-full max-w-5xl -translate-x-1/2 h-36 blur-3xl bg-sky-500/10" />
      </div>
    </div>
  );
}
