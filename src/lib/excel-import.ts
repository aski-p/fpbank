import type { FPItem, FPType } from "@/stores/fp-store";
import { FP_WEIGHTS } from "@/lib/fp-calculator";

const FP_TYPES = new Set<FPType>(["ILF", "EIF", "EI", "EO", "EQ"]);

interface ColumnMap {
  appName: number;
  businessName: number;
  processName: number;
  description: number;
  fpType: number;
  weight: number;
}

function text(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim();
}

function header(value: unknown): string {
  return text(value).replace(/[①②③④⑤⑥⑦⑧⑨⑩0-9\s_/-]+/g, "").toLocaleLowerCase("ko-KR");
}

function findColumn(row: unknown[], pattern: RegExp): number {
  return row.findIndex((value) => pattern.test(header(value)));
}

function findHeader(rows: unknown[][]): { rowIndex: number; columns: ColumnMap } | undefined {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;
    const columns: ColumnMap = {
      appName: findColumn(row, /^(?:어플리케이션명|애플리케이션명|앱명)$/),
      businessName: findColumn(row, /^(?:세부)?업무명$/),
      processName: findColumn(row, /^(?:단위)?프로세스명$/),
      description: findColumn(row, /^(?:단위프로세스)?설명$/),
      fpType: findColumn(row, /^fp유형$/),
      weight: findColumn(row, /^가중치$/),
    };
    if (Object.values(columns).every((index) => index >= 0)) return { rowIndex, columns };
  }
  return undefined;
}

function numeric(value: unknown): number {
  if (typeof value === "number") return value;
  return Number(text(value).replace(/,/g, ""));
}

export function parseFPExcelRows(
  rows: unknown[][],
  makeId: () => string,
): FPItem[] {
  const located = findHeader(rows);
  if (!located) throw new Error("Excel에서 기능점수 표 헤더를 찾지 못했습니다.");

  const items: FPItem[] = [];
  for (const row of rows.slice(located.rowIndex + 1)) {
    if (!Array.isArray(row)) continue;
    const fpType = text(row[located.columns.fpType]).toUpperCase() as FPType;
    const rawWeight = row[located.columns.weight];
    if (!FP_TYPES.has(fpType)) continue;
    const sourceExcluded = rawWeight === null || rawWeight === undefined || text(rawWeight) === "";
    const weight = sourceExcluded ? FP_WEIGHTS[fpType] : numeric(rawWeight);
    if (!Number.isFinite(weight) || weight <= 0) continue;

    const appName = text(row[located.columns.appName]);
    const businessName = text(row[located.columns.businessName]);
    const processName = text(row[located.columns.processName]);
    const description = text(row[located.columns.description]);
    if (!appName || !businessName || !processName || !description) continue;

    items.push({
      id: makeId(),
      appName: appName || "i-ONE Bank",
      businessName: businessName || "미분류 업무",
      processName: processName || description,
      description: description || processName,
      fpType,
      weight,
      included: !sourceExcluded,
      remark: [
        sourceExcluded ? "Excel 원본 합산 제외" : "Excel 원본 FP",
        text(row[located.columns.weight + 1]),
      ].filter(Boolean).join(" · "),
    });
  }

  if (items.length === 0) throw new Error("Excel에서 유효한 기능점수 항목을 찾지 못했습니다.");
  return items;
}
