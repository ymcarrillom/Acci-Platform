import Image from "next/image";

export default function ChurchLogo({
  className = "",
  size = "md", // md | lg
}) {
  const dims = size === "lg" ? "h-12 w-40" : "h-10 w-32";

  return (
    <div className={`relative ${dims} ${className}`}>
      {/* Glow sutil azul para integrarlo */}
      <div className="pointer-events-none absolute -inset-6 blur-2xl opacity-60 bg-gradient-to-br from-sky-500/20 via-blue-500/12 to-transparent" />

      {/* El truco: mix-blend-screen hace que el negro sea "invisible" */}
      <div className="relative h-full w-full mix-blend-screen opacity-90">
        <Image
          src="/brand/iglesia.jpg"
          alt="Conexión con el Cielo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
