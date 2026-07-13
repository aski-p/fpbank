import { motion } from "framer-motion";

const TYPES = ["ILF", "EIF", "EQ", "EI", "EO"] as const;
const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  ILF: "내부 논리",
  EIF: "외부 연계",
  EQ: "외부 질의",
  EI: "외부 입력",
  EO: "외부 출력",
};

interface StatsCardProps {
  fpByType: Record<string, { count: number; totalFp?: number } | undefined>;
}

export function StatsCard({ fpByType }: StatsCardProps) {
  const maxTotal = Math.max(...TYPES.map((type) => fpByType[type]?.totalFp ?? 0), 1);

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
        <span className="text-xs text-[#92978f]">FP 기준</span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-5 xl:grid-cols-5">
        {TYPES.map((type, index) => {
          const result = fpByType[type];
          const total = result?.totalFp ?? 0;
          const width = `${Math.max((total / maxTotal) * 100, total > 0 ? 10 : 0)}%`;
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="rounded-[18px] bg-[#f5f7f2] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#4d534a]">{type}</span>
                <span className="font-mono text-xs text-[#8d938a]">{result?.count ?? 0}</span>
              </div>
              <p className="mt-5 text-xl font-semibold tracking-[-0.04em]">{total.toLocaleString("ko-KR")}</p>
              <p className="mt-1 truncate text-[11px] text-[#8a9086]">{TYPE_LABELS[type]}</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#dfe4da]">
                <div className="h-full rounded-full bg-[#151714] transition-all" style={{ width }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.article>
  );
}
