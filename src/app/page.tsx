'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FPItem, FPType, classifyFPType, calculateFP,
  FP_WEIGHTS, FP_TYPE_LABELS, FP_TYPE_COLORS,
} from '@/lib/fp-calculator';

function makeId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2);
}

export default function FPBankApp() {
  const [appName, setAppName] = useState('i-ONE Bank 3.0');
  const [bizName, setBizName] = useState('');
  const [procName, setProcName] = useState('');
  const [desc, setDesc] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [items, setItems] = useState<FPItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  const result = calculateFP(items);

  function addOne() {
    if (!desc.trim()) return;
    const t = classifyFPType(desc);
    const w = FP_WEIGHTS[t];
    const b = bizName.length > 0 ? bizName : appName;
    const p = procName.length > 0 ? procName : desc;
    const newItem: FPItem = {
      id: makeId(),
      appName: appName,
      businessName: b,
      processName: p,
      description: desc,
      fpType: t,
      weight: w,
      remark: remarkText,
    };
    setItems(function (prev) { return prev.concat([newItem]); });
    setDesc('');
    setProcName('');
    setRemarkText('');
  }

  function removeOne(id: string) {
    if (editId === id) { setEditId(null); return; }
    setItems(function (prev) { return prev.filter(function (i) { return i.id !== id; }); });
  }

  function editRow(id: string, key: string, val: string | number) {
    const typed = id && key && val != null;
    if (!typed) return;
    setItems(function (prev) {
      return prev.map(function (i) {
        if (i.id !== id) return i;
        if (key === 'fpType') {
          return Object.assign({}, i, { fpType: val as FPType, weight: FP_WEIGHTS[val as FPType] });
        }
        return Object.assign({}, i, { [key]: val });
      });
    });
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [];
    rows.push([]);
    rows.push([]);
    rows.push(['총 기능점수', String(result.totalFP)]);
    rows.push(['보정 후 기능점수(×0.6)', String(result.adjustedFP)]);

    ['ILF', 'EIF', 'EI', 'EO', 'EQ'].forEach(function (tp) {
      const info = result.fpByType[tp as FPType];
      if (info) {
        rows.push([tp + ': ' + info.count + '개, 합계 ' + info.totalFp]);
      }
    });

    rows.push([]);
    rows.push(['기능점수 산정']);
    rows.push(['①어플리케이션명', '②세부 업무명', '③단위프로세스명', '단위프로세스 설명', '④FP유형', '⑤가중치', '비고']);

    items.forEach(function (it) {
      rows.push([it.appName, it.businessName, it.processName, it.description, it.fpType, String(it.weight), it.remark || '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 32 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '기능점수 산정표');

    const now = new Date().toISOString().slice(0, 10);
    const safeName = appName.replace(/\s+/g, '');
    XLSX.writeFile(wb, '_FP_' + safeName + '_' + now + '.xlsx');
  }

  function clearAll() {
    if (!confirm('모든 기능을 삭제하시겠습니까?')) return;
    setItems([]);
    setEditId(null);
  }

  const previewType: FPType | null = desc.trim() ? classifyFPType(desc) : null;
  const pvColor = previewType ? FP_TYPE_COLORS[previewType] || '#fff' : '';
  const pvLabel = previewType ? FP_TYPE_LABELS[previewType] : '';

  function onDescKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addOne(); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <header className="pt-12 pb-4 px-4 text-center">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
          ⚡ FPBank ⚡
        </h1>
        <p className="mt-2 text-indigo-300 text-lg font-medium">FP 기능점수 자동 산정기</p>
      </header>

      {/* Input Panel */}
      <section className="max-w-5xl mx-auto px-4 mt-6">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md shadow-xl">
          <InputRow label="① 애플리케이션명" value={appName} onChange={setAppName} />
          <InputRow label="② 세부 업무명 (선택)" value={bizName} onChange={setBizName} />
          <InputRow label="③ 단위프로세스명 (선택)" value={procName} onChange={setProcName} />

          {/* Function name input + badge */}
          <div className="flex items-end gap-3 mt-3">
            <div className="flex-1">
              <InputRow label="📝 기능명 (Enter로 추가)" value={desc} onChange={setDesc} onKeyDown={onDescKey} />
            </div>
            {previewType && (
              <span
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold border animate-pulse"
                style={{
                  backgroundColor: pvColor + '20',
                  color: pvColor,
                  borderColor: pvColor + '40',
                }}
              >
                🔮 {pvLabel} / {FP_WEIGHTS[previewType]} FP
              </span>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={addOne}
            disabled={desc.trim().length === 0}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-30 text-white py-3 rounded-xl font-bold text-lg"
          >
            ➕ 기능 추가
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-5xl mx-auto px-4 mt-6">
        <StatsRow result={result} />
      </section>

      {/* Total Card */}
      <section className="max-w-5xl mx-auto px-4 mt-4">
        <div className="rounded-2xl border border-indigo-400/30 bg-gradient-to-r from-indigo-950 via-purple-950 to-pink-950 p-6 text-center shadow-xl">
          <div className="text-sm text-indigo-300 font-medium">총 기능점수</div>
          <div className="text-5xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            {result.totalFP} FP
          </div>
          <div className="mt-2 text-sm text-pink-300">→ 보정 후 (×0.6)</div>
          <div className="text-2xl font-bold text-fuchsia-300">{result.adjustedFP} FP</div>
        </div>
      </section>

      {/* Table Section */}
      <section className="max-w-5xl mx-auto px-4 mt-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <DataTable items={items} editId={editId} onEdit={editRow} onRemove={removeOne} setEditId={setEditId} />
              <FooterBar totalRows={items.length} onClear={clearAll} onDownload={downloadExcel} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ──────── Sub-components ──────── */

function InputRow({ label, value, onChange, onKeyDown }: {
  label: string; value: string; onChange: (s: string) => void; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block mb-3">
      <span className="text-xs font-medium text-indigo-300 block mb-1">{label}</span>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/60 transition-all"
      />
    </label>
  );
}

function StatsRow({ result }: { result: ReturnType<typeof calculateFP> }) {
  const types = ['ILF', 'EIF', 'EI', 'EO', 'EQ'] as FPType[];
  return (
    <div className="grid grid-cols-5 gap-3">
      {types.map(function (tp) {
        const info = result.fpByType[tp];
        return (
          <div key={tp} className="rounded-xl border bg-black/40 p-3 text-center backdrop-blur-sm"
            style={{ borderColor: (FP_TYPE_COLORS[tp] || '#888') + '30' }}>
            <div className="text-xs font-bold mb-1" style={{ color: FP_TYPE_COLORS[tp] || '#fff' }}>{tp}</div>
            <div className="text-xl font-black">{info ? info.count : 0}</div>
            <div className="text-xs opacity-50">{info ? info.totalFp : 0} FP</div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center text-indigo-400">
      <p className="text-lg font-medium mb-2">📝 기능명을 입력하고 추가하세요</p>
      <p className="text-sm opacity-60">시스템이 FP 유형과 가중치를 자동으로 분류합니다.</p>
    </div>
  );
}

function DataTable({ items, editId, onEdit, onRemove, setEditId }: {
  items: FPItem[]; editId: string | null; onEdit: (id: string, key: string, val: string | number) => void;
  onRemove: (id: string) => void; setEditId: (id: string | null) => void;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-white/10 text-indigo-200 font-semibold">
          {['#', '① 앱명', '② 업무명', '③ 프로세스', '기능(설명)', '④ FP유형', '⑤ 가중치', '조작'].map(function (h) {
            return <th key={h} className="px-3 py-2">{h}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {items.map(function (item, idx) {
          const isEditing = editId === item.id;
          const col = FP_TYPE_COLORS[item.fpType] || '#fff';

          return (
            <tr key={item.id} className={"border-b border-white/5 " + (isEditing ? 'bg-indigo-900/20' : '')}>
              <td className="px-3 py-2 text-gray-500 w-8">{idx + 1}</td>

              {/* 앱명 */}
              {Cell(item.id, isEditing, onEdit, item.appName, 'appName')}

              {/* 업무명 */}
              {Cell(item.id, isEditing, onEdit, item.businessName, 'businessName')}

              {/* 프로세스명 */}
              {Cell(item.id, isEditing, onEdit, item.processName, 'processName')}

              {/* 설명 + badge */}
              <td className="px-2 py-2 min-w-[160px]">
                <div>{item.description}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: col + '30', color: col }}>
                  {item.fpType}
                </span>
              </td>

              {/* FP Type select */}
              <td className="px-2 py-2">
                {isEditing ? (
                  <select value={item.fpType} onChange={(e) => onEdit(item.id, 'fpType', e.target.value)}
                    className="bg-slate-800 border border-indigo-400 text-white rounded px-1 py-0.5 text-xs">
                    {(['ILF', 'EIF', 'EQ', 'EI', 'EO'] as FPType[]).map(function (t) {
                      return <option key={t} value={t}>{t}({FP_WEIGHTS[t]})</option>;
                    })}
                  </select>
                ) : (
                  <span>{item.fpType}</span>
                )}
              </td>

              {/* Weight */}
              <td className="px-2 py-2 text-right font-mono">
                {isEditing ? (
                  <input type="number" step="0.1" value={item.weight}
                    onChange={(e) => onEdit(item.id, 'weight', parseFloat(e.target.value))}
                    className="bg-slate-800 border border-indigo-400 rounded w-20 px-1 py-0.5 text-xs" />
                ) : (
                  <span>{item.weight}</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-2 py-2 text-right">
                <button onClick={() => setEditId(isEditing ? null : item.id)} title="편집" className="mr-1">
                  {isEditing ? '✅' : '✏️'}
                </button>
                <button onClick={() => onRemove(item.id)} title="삭제">❌</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Cell(id: string, isEditing: boolean, onEdit: (id: string, k: string, v: string | number) => void, val: string, key: string) {
  return (
    <td className="px-2 py-2">
      {isEditing ? (
        <input value={val} onChange={(e) => onEdit(id, key, e.target.value)}
          className="bg-slate-800 border border-indigo-400 rounded px-1 w-full text-xs" />
      ) : (
        <span>{val}</span>
      )}
    </td>
  );
}

function FooterBar({ totalRows, onClear, onDownload }: { totalRows: number; onClear: () => void; onDownload: () => void }) {
  return (
    <div className="sticky bottom-0 flex justify-between items-center py-3 px-4 bg-slate-950/80 backdrop-blur-md border-t border-white/10">
      <span className="text-sm text-indigo-300 font-medium">{totalRows}개 항목</span>
      <div className="flex gap-2">
        <button onClick={onClear}
          className="px-4 py-2 rounded-lg bg-red-950/60 border border-red-700/30 text-red-300 hover:bg-red-950/80 transition-all text-sm">
          🗑️ 전체삭제
        </button>
        <button onClick={onDownload}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg active:scale-[0.98] transition-all">
          💾 Excel 다운로드
        </button>
      </div>
    </div>
  );
}
