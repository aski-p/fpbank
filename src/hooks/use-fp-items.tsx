import { useFPStore, FPItem } from "@/stores/fp-store";
import { classifyFPType, calculateFP, FP_WEIGHTS } from "@/lib/fp-calculator";
import * as XLSX from "xlsx";

function makeId() {
  return Date.now().toString() + "-" + Math.random().toString(36).slice(2);
}

export function useFPItems() {
  const items = useFPStore((s) => s.items);
  const editId = useFPStore((s) => s.editId);
  const addItemHandler = useFPStore((s) => s.addItem);
  const removeItem = useFPStore((s) => s.removeItem);
  const updateItem = useFPStore((s) => s.updateItem);
  const setEditId = useFPStore((s) => s.setEditId);
  const clearAll = useFPStore((s) => s.clearAll);
  const loadFromExcel = useFPStore((s) => s.loadFromExcel);

  const result = calculateFP(items);

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target?.result) return;
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const wsName = wb.SheetNames[0];
        if (!wsName) return;
        const rows = (XLSX.utils.sheet_to_json(wb.Sheets[wsName], { header: 1 }) as unknown) as any[][];
        const parsed: FPItem[] = [];
        for (const row of rows) {
          if (!row || row.length === 0) continue;
          let ra = String(row[0] ?? "");
          let rb = String(row[1] ?? "");
          let rp = String(row[2] ?? "");
          let rd = String(row[3] ?? "");
          if (!ra && !rb && !rp && !rd) continue;
          const fpType = classifyFPType(rp || rd) as FPItem["fpType"];
          parsed.push({ id: makeId(), appName: ra || "i-ONE Bank", businessName: rb || ra, processName: rp || rd, description: rd || rp, fpType, weight: FP_WEIGHTS[fpType], remark: "(엑셀 자동 분석)" });
        }
        loadFromExcel(parsed);
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  }

  function handleDownload() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [];
    rows.push(["총 기능점수", result.totalFP]);
    rows.push(["보정후 ×0.6", result.adjustedFP]);
    for (const tp of ["ILF", "EIF", "EI", "EO", "EQ"]) {
      const r = result.fpByType[tp as keyof typeof result.fpByType];
      if (r) rows.push([`${tp}: ${r.count}개, 합계 ${r.totalFp}`]);
    }
    rows.push([]);
    rows.push(["어플리케이션명", "업무명", "프로세스명", "설명", "FP유형", "가중치"]);
    for (const it of items) {
      rows.push([it.appName, it.businessName, it.processName, it.description, String(it.fpType), String(it.weight)]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "FP산정");
    XLSX.writeFile(wb, `_fp_` + new Date().toISOString().slice(0, 10) + ".xlsx");
  }

  return {
    items, editId, result, handleFileUpload, handleDownload, addItemHandler as addItem, removeItem, updateItem, setEditId, clearAll, loadFromExcel
  };
}
