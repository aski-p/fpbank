import { motion } from "framer-motion";

type FPTypeKey = "ILF" | "EIF" | "EQ" | "EI" | "EO";

export const FP_COLORS: Record<FPTypeKey, string> = {
  ILF: "#3b82f6", // Blue-600 ✅ (Primary only)
  EIF: "#16a34a", // Green-600 ✅ (Success state)
  EQ: "#f59e0b",   // Orange-600 ✅ (Warning state)
  EI: "#d97706",   // Amber-600 ✅ (Warm variant of primary accent)
  EO: "#1d4ed8",   // Blue-700 ✅ (Primary shade)
};

export interface StatCardsProps {
  fpByType: Record<string, { count: number; totalFp?: number } | undefined>;
}

export function StatsCard({ fpByType }: StatCardsProps) {
  const types: FPTypeKey[] = ["ILF", "EIF", "EQ", "EI", "EO"];

  return (
    <div className="grid grid-cols-5 gap-4">
      {types.map((tp, idx) => {
        const r = fpByType[tp];
        return (
          <motion.div
            key={tp}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 * (idx + 1) }}
            className="relative rounded-[16px] bg-white p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center"
          >
            <div
              className="inline-block w-3 h-3 rounded-full mb-2"
              style={{ backgroundColor: FP_COLORS[tp] }}
            />
            <div className="text-sm font-medium text-gray-500">{tp}</div>
            <div className="text-2xl font-semibold mt-1" style={{ color: FP_COLORS[tp] }}>
              {r?.count || 0}
            </div>
            <span className="text-xs text-gray-400 mt-1">합계{r?.totalFp ?? 0}FP</span>
          </motion.div>
        );
      })}
    </div>
  );
}
