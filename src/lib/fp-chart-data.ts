import { FP_TYPE_COLORS } from "@/lib/fp-calculator";
import type { FPType } from "@/stores/fp-store";

export const FP_CHART_TYPES: FPType[] = ["ILF", "EIF", "EI", "EO", "EQ"];

export const FP_CHART_LABELS: Record<FPType, string> = {
  ILF: "내부 논리",
  EIF: "외부 인터페이스",
  EI: "외부 입력",
  EO: "외부 출력",
  EQ: "외부 질의",
};

export interface FPChartDatum {
  type: FPType;
  label: string;
  color: string;
  count: number;
  totalFp: number;
  countRatio: number;
  fpRatio: number;
  donutRatio: number;
}

export function buildFPChartData(
  fpByType: Record<string, { count: number; totalFp?: number } | undefined>,
): FPChartDatum[] {
  const values = FP_CHART_TYPES.map((type) => ({
    type,
    count: Math.max(0, fpByType[type]?.count ?? 0),
    totalFp: Math.max(0, fpByType[type]?.totalFp ?? 0),
  }));
  const totalCount = values.reduce((sum, value) => sum + value.count, 0);
  const maxFp = Math.max(...values.map((value) => value.totalFp), 0);

  return values.map((value) => ({
    ...value,
    label: FP_CHART_LABELS[value.type],
    color: FP_TYPE_COLORS[value.type],
    countRatio: totalCount > 0 ? value.count / totalCount * 100 : 0,
    fpRatio: maxFp > 0 ? value.totalFp / maxFp * 100 : 0,
    donutRatio: totalCount > 0 ? value.count / totalCount * 100 : 0,
  }));
}
