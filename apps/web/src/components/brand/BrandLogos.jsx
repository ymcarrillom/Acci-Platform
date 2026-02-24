import Image from 'next/image';

export default function BrandLogos({ variant = 'horizontal' }) {
  const isHorizontal = variant === 'horizontal';

  return (
    <div className={`flex items-center gap-3 ${isHorizontal ? '' : 'flex-col'}`}>
      <div className="flex items-center gap-3">
        <Image
          src="/brand/logo-iglesia.png"
          alt="Logo Iglesia"
          width={44}
          height={44}
          className="rounded-xl"
          priority
        />
        <div className="h-8 w-px bg-white/10" />
        <Image
          src="/brand/logo-acci.png"
          alt="Logo ACCI"
          width={44}
          height={44}
          className="rounded-xl"
          priority
        />
      </div>
      <div className={`${isHorizontal ? '' : 'text-center'}`}>
        <div className="text-sm font-semibold">ACCI Platform</div>
        <div className="text-xs text-slate-400">Formación cristiana · LMS</div>
      </div>
    </div>
  );
}
