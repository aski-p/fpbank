import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/data-table";
import type { FPItem } from "@/stores/fp-store";
import type { DuplicateCandidate } from "@/lib/fp-duplicates";

const item: FPItem = {
  id: "1",
  appName: "i-ONE Bank 3.0",
  businessName: "전체 투자 현황",
  processName: "월별 배당 조회",
  description: "월별 배당 현황 정보 조회",
  fpType: "EQ",
  weight: 3.9,
  remark: "",
};

describe("DataTable mobile editor", () => {
  it("keeps every previously editable name field available", () => {
    const markup = renderToStaticMarkup(createElement(DataTable, {
      items: [item],
      editId: "1",
      setEditId: vi.fn(),
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      toggleItemIncluded: vi.fn(),
      duplicateCandidates: new Map<string, DuplicateCandidate>(),
    }));

    expect(markup).toContain('data-mobile-item-editor="true"');
    expect(markup).toContain('aria-label="1번 애플리케이션명"');
    expect(markup).toContain('aria-label="1번 업무명"');
    expect(markup).toContain('aria-label="1번 단위프로세스명"');
    expect(markup).toContain('aria-label="1번 단위프로세스 설명"');
  });

  it("renders FP inclusion controls and duplicate candidate groups", () => {
    const duplicateCandidates = new Map<string, DuplicateCandidate>([["1", {
      groupId: "D1",
      reason: "업무·프로세스명이 동일함",
      similarity: 1,
    }]]);
    const markup = renderToStaticMarkup(createElement(DataTable, {
      items: [{ ...item, included: false }],
      editId: null,
      setEditId: vi.fn(),
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      toggleItemIncluded: vi.fn(),
      duplicateCandidates,
    }));

    expect(markup).toContain('aria-label="1번 항목 FP 합산 포함"');
    expect(markup).toContain("중복 가능 D1");
    expect(markup).toContain("합산 제외");
  });
});
