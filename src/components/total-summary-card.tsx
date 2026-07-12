import { motion } from "framer-motion";
import { Calculator, Award } from "lucide-react";

interface TotalSummaryCardProps {
  totalFP: number;
  adjustedFP: number;
}

export function TotalSummaryCard({ totalFP, adjustedFP }: TotalSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-[16px] p-6 shadow-sm border border-gray-200 flex items-center justify-between"
    >
      <div>
        <h3 className="text-[24px] font-semibold text-gray-900 tracking-tight">총 기능점수</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">FP 산정 기준에 따른 자동 분석 결과입니다.</p>
        
        <div className="flex items-end gap-8">
          <div>
            <span className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-2">
              <Calculator className="w-4 h-4" strokeWidth={1.5} />
              총 FP
            </span>
            <div className="text-[32px] font-bold tracking-tighter text-blue-600">{totalFP}</div>
          </div>
          <div>
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2">
              <Award className="w-4 h-4" strokeWidth={1.5} />
              보정 후 (x0.6)
            </span>
            <div className="text-[32px] font-bold tracking-tighter text-emerald-600">{adjustedFP}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
