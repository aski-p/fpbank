import { motion } from "framer-motion";
import { buildFPChartData } from "@/lib/fp-chart-data";

interface StatsCardProps {
  fpByType: Record<string, { count: number; totalFp?: number } | undefined>;
}

const chartCardClass = "rounded-[20px] border border-[#e3e7df] bg-[#fafbf8] p-4 sm:p-5";

function DonutChart({ data }: { data: ReturnType<typeof buildFPChartData> }) {
  let offset = 0;
  const totalCount = data.reduce((sum, row) => sum + row.count, 0);
  const segments = data.map((row) => {
    const currentOffset = offset;
    offset += row.donutRatio;
    return { ...row, currentOffset };
  });

  return (
    <section className={chartCardClass}>
      <p className="text-sm font-semibold text-[#353a33]">1. 도넛 · 항목 비율</p>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="FP 유형별 항목 수 도넛 그래프">
            <circle cx="60" cy="60" r="44" fill="none" stroke="#e5e9e1" strokeWidth="18" />
            {segments.map((row) => row.donutRatio > 0 && (
              <circle
                key={row.type}
                cx="60"
                cy="60"
                r="44"
                fill="none"
                pathLength="100"
                stroke={row.color}
                strokeWidth="18"
                strokeDasharray={`${row.donutRatio} ${100 - row.donutRatio}`}
                strokeDashoffset={-row.currentOffset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <strong className="font-mono text-2xl text-[#20231f]">{totalCount}</strong>
            <span className="text-[11px] text-[#878d84]">전체 항목</span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {data.map((row) => (
            <div key={row.type} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[#646a61]"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />{row.type}</span>
              <span className="font-mono text-[#343933]">{row.count} · {row.donutRatio.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VerticalBarChart({ data }: { data: ReturnType<typeof buildFPChartData> }) {
  return (
    <section className={chartCardClass}>
      <p className="text-sm font-semibold text-[#353a33]">2. 세로 막대 · 유형별 FP</p>
      <div className="mt-5 flex h-52 items-end justify-around gap-2 border-b border-[#dfe4da] px-1 pb-2">
        {data.map((row) => (
          <div key={row.type} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="font-mono text-[10px] text-[#70766d]">{row.totalFp.toLocaleString("ko-KR")}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(row.fpRatio, row.totalFp > 0 ? 5 : 0)}%` }}
              className="w-full max-w-11 rounded-t-lg"
              style={{ backgroundColor: row.color }}
            />
            <span className="font-mono text-[11px] font-semibold text-[#51574e]">{row.type}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HorizontalBarChart({ data }: { data: ReturnType<typeof buildFPChartData> }) {
  const maxCount = Math.max(...data.map((row) => row.count), 1);
  return (
    <section className={chartCardClass}>
      <p className="text-sm font-semibold text-[#353a33]">3. 가로 막대 · 유형별 건수</p>
      <div className="mt-5 space-y-4">
        {data.map((row) => (
          <div key={row.type} className="grid grid-cols-[34px_1fr_32px] items-center gap-3">
            <span className="font-mono text-xs font-semibold text-[#555b52]">{row.type}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[#e4e8e0]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${row.count / maxCount * 100}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: row.color }}
              />
            </div>
            <span className="text-right font-mono text-xs text-[#737970]">{row.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RadarChart({ data }: { data: ReturnType<typeof buildFPChartData> }) {
  const center = 100;
  const radius = 70;
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / data.length;
    const distance = radius * ratio;
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as const;
  };
  const polygon = (ratio: number) => data.map((_, index) => point(index, ratio).join(",")).join(" ");
  const values = data.map((row, index) => point(index, row.fpRatio / 100).join(",")).join(" ");

  return (
    <section className={chartCardClass}>
      <p className="text-sm font-semibold text-[#353a33]">4. 레이더 · FP 상대 분포</p>
      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 200 200" className="h-56 w-56 max-w-full" role="img" aria-label="FP 유형별 상대 분포 레이더 그래프">
          {[0.25, 0.5, 0.75, 1].map((ratio) => <polygon key={ratio} points={polygon(ratio)} fill="none" stroke="#dce1d8" strokeWidth="1" />)}
          {data.map((_, index) => {
            const [x, y] = point(index, 1);
            return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="#e1e5de" strokeWidth="1" />;
          })}
          <polygon points={values} fill="#9ddd55" fillOpacity="0.28" stroke="#568f2f" strokeWidth="2" />
          {data.map((row, index) => {
            const [x, y] = point(index, row.fpRatio / 100);
            const [labelX, labelY] = point(index, 1.18);
            return (
              <g key={row.type}>
                <circle cx={x} cy={y} r="3" fill={row.color} />
                <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" className="fill-[#555b52] text-[10px] font-semibold">{row.type}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export function StatsCard({ fpByType }: StatsCardProps) {
  const data = buildFPChartData(fpByType);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
      className="rounded-[28px] border border-[#dfe3dc] bg-white p-5 sm:p-7"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9086]">Distribution</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">유형별 분석</h2>
        </div>
        <span className="text-xs text-[#92978f]">건수 · FP 기준</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        {data.map((row, index) => (
          <motion.div key={row.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.04 }} className="rounded-[18px] bg-[#f5f7f2] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-[#4d534a]">{row.type}</span>
              <span className="font-mono text-xs text-[#8d938a]">{row.count}</span>
            </div>
            <p className="mt-5 text-xl font-semibold tracking-[-0.04em]">{row.totalFp.toLocaleString("ko-KR")}</p>
            <p className="mt-1 truncate text-[11px] text-[#8a9086]">{row.label}</p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#dfe4da]"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(row.fpRatio, row.totalFp > 0 ? 10 : 0)}%`, backgroundColor: row.color }} /></div>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <DonutChart data={data} />
        <VerticalBarChart data={data} />
        <HorizontalBarChart data={data} />
        <RadarChart data={data} />
      </div>
    </motion.article>
  );
}
