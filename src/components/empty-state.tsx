import { motion } from "framer-motion";
import { Upload, FileSpreadsheet } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center"
      >
        <div className="mb-6 p-4 rounded-full bg-blue-50">
          <Upload className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-medium mb-2 text-gray-900 tracking-tight">
          FP 항목이 없습니다
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Excelf 파일로 기능을 드래그하거나 아래 입력창에 기능명을 입력하세요.
          자동으로 분석됩니다 📊
        </p>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl text-xs text-blue-600">
          <FileSpreadsheet className="w-4 h-4" strokeWidth={1.5} />
          <span>XLSX 파일 드래그 & 드롭으로 자동 분석</span>
        </div>
      </motion.div>
    </div>
  );
}
