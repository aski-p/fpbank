import { useFPStore, type FPItem } from "@/stores/fp-store";
import { calculateFP } from "@/lib/fp-calculator";
import { parseFPExcelRows } from "@/lib/excel-import";
import * as XLSX from "xlsx";
import { assertExcelRowLimit, MAX_EXCEL_ROWS, validateExcelFile } from "@/lib/excel-file";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useFPItems() {
  const items = useFPStore((state) => state.items);
  const editId = useFPStore((state) => state.editId);
  const addItemToStore = useFPStore((state) => state.addItem);
  const removeItem = useFPStore((state) => state.removeItem);
  const updateItem = useFPStore((state) => state.updateItem);
  const setEditId = useFPStore((state) => state.setEditId);
  const clearAll = useFPStore((state) => state.clearAll);
  const loadFromExcel = useFPStore((state) => state.loadFromExcel);

  const result = calculateFP(items);

  function addItem(item: Omit<FPItem, "id">) {
    addItemToStore({ ...item, id: makeId() });
  }

  async function handleFileUpload(file: File) {
      validateExcelFile(file);
      try {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: MAX_EXCEL_ROWS + 1 });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return;
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1 });
        assertExcelRowLimit(rows.length);
        const parsed = parseFPExcelRows(rows, makeId);
        loadFromExcel(parsed);
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error("Excel 파일을 분석하지 못했습니다.");
      }
  }

  function handleDownload() {
    const workbook = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["총 기능점수", result.totalFP],
      ["보정 후 기능점수", result.adjustedFP],
    ];

    for (const type of ["ILF", "EIF", "EI", "EO", "EQ"] as const) {
      const typeResult = result.fpByType[type];
      rows.push([`${type}: ${typeResult.count}개`, `합계 ${typeResult.totalFp} FP`]);
    }

    rows.push([], ["애플리케이션명", "업무명", "프로세스명", "설명", "FP유형", "가중치"]);
    for (const item of items) {
      rows.push([item.appName, item.businessName, item.processName, item.description, item.fpType, item.weight]);
    }

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "FP산정");
    XLSX.writeFile(workbook, `fpbank_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return {
    items,
    editId,
    result,
    handleFileUpload,
    handleDownload,
    addItem,
    removeItem,
    updateItem,
    setEditId,
    clearAll,
    loadFromExcel,
  };
}
