import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet } from "lucide-react";

interface Props {
  onFileUpload: (file: File) => void;
}

export function FpUploadZone({ onFileUpload }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files[0]) onFileUpload(e.dataTransfer.files[0]);
  }

  return (
    <div className="relative">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-[16px] border-2 transition-colors ${
          isDragOver ? "border-blue-300 bg-blue-50/50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex flex-col items-center py-8 px-6 text-center">
          <div className="mb-4 p-3 rounded-full bg-gray-50">
            <Upload className={`w-6 h-6 transition-colors ${isDragOver ? "text-blue-600" : "text-gray-400"}`} strokeWidth={1.5} />
          </div>
          <p className="text-base font-medium text-gray-900 mb-3">
            파일로 여기로 드래그하세요 📂
          </p>
          <p className="text-sm text-gray-500 mb-4 max-w-xs">
            엑설 파일을 여기로 드래그하거나 아래 버튼을 클릭하여 선택하세요. Excel의 첫 번째 시트가 분석됩니다.
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="min-h-[44px] min-w-[120px] px-4 py-3 rounded-[14px] bg-blue-600 text-white font-medium hover:shadow-sm active:scale-[0.98] transition-opacity"
          >
            파일 📎 선택
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const f = e.target.files;
          if (f && f[0]) onFileUpload(f[0]);
        }}
        className="hidden"
      />
    </div>
  );
}
