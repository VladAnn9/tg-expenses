"use client";

export default function GradientMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 motion-reduce:!animate-none md:[animation:zen-mesh-drift_24s_ease-in-out_infinite_alternate]"
        style={{
          backgroundImage: [
            "radial-gradient(60% 55% at 20% 30%, rgba(232,226,219,0.55), transparent 70%)",
            "radial-gradient(45% 40% at 85% 15%, rgba(212,197,178,0.35), transparent 70%)",
            "radial-gradient(50% 50% at 70% 90%, rgba(139,157,131,0.18), transparent 70%)",
          ].join(", "),
          backgroundRepeat: "no-repeat",
          backgroundSize: "200% 200%, 200% 200%, 200% 200%",
          backgroundPosition: "0% 0%, 100% 0%, 100% 100%",
        }}
      />
    </div>
  );
}
