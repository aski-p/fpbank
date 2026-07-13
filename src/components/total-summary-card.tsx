import { motion } from "framer-motion";
import { ArrowUpRight, Gauge } from "lucide-react";

interface TotalSummaryCardProps {
  totalFP: number;
  adjustedFP: number;
  itemCount: number;
}

export function TotalSummaryCard({ totalFP, adjustedFP, itemCount }: TotalSummaryCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] bg-[#151714] p-6 text-white sm:p-8"
    >
      <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-[#b9f56a]/15 blur-2xl" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            <Gauge className="h-4 w-4 text-[#b9f56a]" aria-hidden="true" />
            Adjusted score
          </span>
          <ArrowUpRight className="h-5 w-5 text-white/35" aria-hidden="true" />
        </div>
        <div className="mt-8 flex items-end gap-3">
          <strong className="text-[clamp(3.5rem,9vw,5.5rem)] font-medium leading-none tracking-[-0.075em] text-[#b9f56a]">
            {adjustedFP.toLocaleString("ko-KR")}
          </strong>
          <span className="mb-2 text-sm font-semibold text-white/55">FP</span>
        </div>
        <p className="mt-3 text-sm text-white/45">총점에 표준 보정률 0.6을 적용한 결과</p>
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
          <div>
            <p className="text-xs text-white/40">원점수</p>
            <p className="mt-1 font-mono text-lg font-medium">{totalFP.toLocaleString("ko-KR")} FP</p>
          </div>
          <div>
            <p className="text-xs text-white/40">분석 항목</p>
            <p className="mt-1 font-mono text-lg font-medium">{itemCount.toLocaleString("ko-KR")} items</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
