import { describe, expect, it } from "vitest";
import { buildFPChartData } from "@/lib/fp-chart-data";

describe("buildFPChartData", () => {
  it("builds count and FP ratios for all five FP types", () => {
    const rows = buildFPChartData({
      ILF: { count: 2, totalFp: 15 },
      EIF: { count: 1, totalFp: 5.4 },
      EI: { count: 0, totalFp: 0 },
      EO: { count: 0, totalFp: 0 },
      EQ: { count: 0, totalFp: 0 },
    });

    expect(rows.map((row) => row.type)).toEqual(["ILF", "EIF", "EI", "EO", "EQ"]);
    expect(rows[0]).toMatchObject({ countRatio: 66.66666666666666, fpRatio: 100 });
    expect(rows[1].countRatio).toBeCloseTo(33.3333, 3);
    expect(rows[1].fpRatio).toBeCloseTo(36);
    expect(rows.reduce((sum, row) => sum + row.donutRatio, 0)).toBeCloseTo(100);
  });

  it("returns finite zero ratios for an empty result", () => {
    const rows = buildFPChartData({});
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.countRatio).toBe(0);
      expect(row.fpRatio).toBe(0);
      expect(row.donutRatio).toBe(0);
      expect(Number.isFinite(row.countRatio)).toBe(true);
    }
  });
});
