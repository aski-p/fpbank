import { describe, expect, it, vi } from "vitest";
import {
  LocalAnalysisConfigurationError,
  LocalAnalysisUnsupportedError,
  analyzeFPDocumentsLocally,
} from "@/lib/local-qwen-analyzer";

function pngFile(): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "screen.png", { type: "image/png" });
}

function ollamaResponse(value: unknown): Response {
  return new Response(JSON.stringify({
    message: { role: "assistant", content: JSON.stringify(value) },
    prompt_eval_count: 100,
    eval_count: 50,
  }), { status: 200, headers: { "content-type": "application/json" } });
}

const observations = {
  documentSummary: "가상자산 등록 화면",
  applicationCandidates: [{ name: "i-ONE Bank 3.0", evidence: "My투자", confidence: 0.8 }],
  screens: [{
    sourceRef: "screen.png",
    screenName: "가상자산 등록",
    menuPath: "My투자 > 가상자산",
    visibleTexts: ["가상자산 등록", "확인"],
    actions: [{ label: "확인", trigger: "버튼 선택", observedOutcome: "등록 완료" }],
    dataGroups: [{ name: "가상자산 연결정보", ownershipEvidence: "등록·수정·삭제 화면", maintainedHere: "local" }],
    notes: [],
  }],
};

const candidates = {
  documentSummary: "가상자산 등록 화면",
  items: [{
    applicationName: "i-ONE Bank 3.0",
    businessName: "가상자산 관리",
    unitProcessName: "가상자산 등록",
    fpType: "EI",
    weight: 999,
    confidence: 0.9,
    evidence: "확인 버튼 후 등록",
    rationale: "연결정보 유지 입력",
    needsReview: false,
  }],
};

describe("analyzeFPDocumentsLocally", () => {
  it("uses Qwen observation and judge passes and normalizes weights", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(candidates));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], {
      baseUrl: "http://qwen.local:11434",
      model: "qwen-test",
      fetchImpl,
    });

    expect(bundle.result.items[0]).toMatchObject({ fpType: "EI", weight: 4 });
    expect(bundle.observations).toEqual(observations);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://qwen.local:11434/api/chat");
    const first = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    const second = JSON.parse(String(fetchImpl.mock.calls[1][1].body));
    expect(first).toMatchObject({ model: "qwen-test", think: false, stream: false });
    expect(second).toMatchObject({ model: "qwen-test", think: true, stream: false });
    expect(first.messages[0].images[0]).not.toContain("data:image");
    expect(JSON.stringify(second)).toContain("가상자산 연결정보");
  });

  it("requires a configured local endpoint", async () => {
    await expect(analyzeFPDocumentsLocally([pngFile()], { baseUrl: "" }))
      .rejects.toBeInstanceOf(LocalAnalysisConfigurationError);
  });

  it("rejects PDFs until local page rendering is configured", async () => {
    const pdf = new File(["%PDF-1.7"], "design.pdf", { type: "application/pdf" });
    await expect(analyzeFPDocumentsLocally([pdf], { baseUrl: "http://qwen.local" }))
      .rejects.toBeInstanceOf(LocalAnalysisUnsupportedError);
  });

  it("maps malformed Qwen output to a safe local error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { content: "not json" } }), { status: 200 }));
    await expect(analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl }))
      .rejects.toThrowError(/구조화된 결과/);
  });
});
