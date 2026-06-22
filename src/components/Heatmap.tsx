"use client";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface HeatmapCell {
  dow: number;   // 0-6
  hour: number;  // 0-23
  score: number; // 0-1, higher = better
}

interface HeatmapProps {
  data: HeatmapCell[];
  topN?: number;
}

function scoreToColor(score: number, isTop: boolean): string {
  if (isTop) return "#f59e0b";
  const lightness = 20 + score * 40;
  const saturation = 30 + score * 50;
  return `hsl(${score > 0.5 ? 142 : 200}, ${saturation}%, ${lightness}%)`;
}

export default function Heatmap({ data, topN = 3 }: HeatmapProps): React.JSX.Element {
  const map = new Map<string, number>();
  for (const cell of data) {
    map.set(`${cell.dow}-${cell.hour}`, cell.score);
  }

  const sorted = [...data].sort((a, b) => b.score - a.score);
  const topKeys = new Set(sorted.slice(0, topN).map((c) => `${c.dow}-${c.hour}`));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour header */}
        <div className="flex ml-10 mb-1">
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <div
              key={h}
              className="text-xs"
              style={{
                width: `${(3 / 24) * 100}%`,
                color: "var(--text-muted)",
              }}
            >
              {String(h).padStart(2, "0")}h
            </div>
          ))}
        </div>

        {DAYS.map((day, dow) => (
          <div key={dow} className="flex items-center mb-0.5 gap-0.5">
            <span
              className="text-xs w-8 shrink-0 text-right mr-2"
              style={{ color: "var(--text-muted)" }}
            >
              {day}
            </span>
            {HOURS.map((hour) => {
              const key = `${dow}-${hour}`;
              const score = map.get(key) ?? 0;
              const isTop = topKeys.has(key);
              return (
                <div
                  key={hour}
                  title={`${day} ${String(hour).padStart(2, "0")}:00 — score: ${score.toFixed(2)}`}
                  className="flex-1 rounded-sm transition-transform hover:scale-110 cursor-default"
                  style={{
                    height: "20px",
                    background: scoreToColor(score, isTop),
                    outline: isTop ? "2px solid var(--brand)" : "none",
                    outlineOffset: "1px",
                  }}
                />
              );
            })}
          </div>
        ))}

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Peor
          </span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((s) => (
              <div
                key={s}
                className="w-5 h-3 rounded-sm"
                style={{ background: scoreToColor(s, false) }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mejor
          </span>
          <div className="w-4 h-3 rounded-sm ml-2" style={{ background: "#f59e0b" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Top {topN}
          </span>
        </div>
      </div>
    </div>
  );
}
