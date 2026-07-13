export const MAX_EXCEL_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EXCEL_ROWS = 10_000;

export class ExcelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelValidationError";
  }
}

export function validateExcelFile(file: File): void {
  const extension = file.name.toLocaleLowerCase("en-US").match(/\.[^.]+$/)?.[0];
  if (extension !== ".xlsx" && extension !== ".xls") {
    throw new ExcelValidationError("Excel .xlsx 또는 .xls 파일만 선택할 수 있습니다.");
  }
  if (file.size > MAX_EXCEL_FILE_BYTES) {
    throw new ExcelValidationError("Excel 파일은 10MB 이하여야 합니다.");
  }
}

export function assertExcelRowLimit(rowCount: number): void {
  if (rowCount > MAX_EXCEL_ROWS) {
    throw new ExcelValidationError("Excel 첫 번째 시트는 최대 10,000행까지 분석할 수 있습니다.");
  }
}
