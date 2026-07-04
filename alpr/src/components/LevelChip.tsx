const LEVEL_STYLE: Record<number, string> = {
  4: "bg-[#e6f4ec] text-success",
  3: "bg-primary-soft text-primary",
  2: "bg-[#fbf0dc] text-amber",
  1: "bg-[#fce9e1] text-danger",
};

export function LevelChip({ level }: { level: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold ${
        LEVEL_STYLE[level] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {level}
    </span>
  );
}

const BAND_STYLE: Record<string, { emoji: string; label: string; className: string }> = {
  innovative_master: {
    emoji: "🟢",
    label: "ต้นแบบสร้างสรรค์",
    className: "bg-[#e6f4ec] text-success",
  },
  fluent: { emoji: "🔵", label: "เชี่ยวชาญช่ำชอง", className: "bg-primary-soft text-primary" },
  developing: { emoji: "🟡", label: "บ่มเพาะทักษะ", className: "bg-[#fbf0dc] text-amber" },
  emerging: { emoji: "🟠", label: "เริ่มจุดประกาย", className: "bg-[#fce9e1] text-danger" },
};

export function BandChip({ band }: { band: string }) {
  const b = BAND_STYLE[band] ?? { emoji: "⚪", label: band, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold ${b.className}`}>
      {b.emoji} {b.label}
    </span>
  );
}
