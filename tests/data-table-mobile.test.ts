import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/data-table";
import type { FPItem } from "@/stores/fp-store";

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
    }));

    expect(markup).toContain('data-mobile-item-editor="true"');
    expect(markup).toContain('aria-label="1번 애플리케이션명"');
    expect(markup).toContain('aria-label="1번 업무명"');
    expect(markup).toContain('aria-label="1번 단위프로세스명"');
    expect(markup).toContain('aria-label="1번 단위프로세스 설명"');
  });
});
