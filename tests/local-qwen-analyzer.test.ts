import { describe, expect, it, vi } from "vitest";
import {
  LocalAnalysisConfigurationError,
  LocalAnalysisUnsupportedError,
  analyzeFPDocumentsLocally,
  parseStructuredQwenContent,
} from "@/lib/local-qwen-analyzer";

function pngFile(name = "screen.png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, { type: "image/png" });
}

function ollamaResponse(value: unknown): Response {
  return new Response(JSON.stringify({
    message: { role: "assistant", content: JSON.stringify(value) },
    prompt_eval_count: 100,
    eval_count: 50,
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function ndjsonOllamaResponse(value: unknown): Response {
  const content = JSON.stringify(value);
  const middle = Math.ceil(content.length / 2);
  const lines = [
    { message: { role: "assistant", content: content.slice(0, middle) }, done: false },
    { message: { role: "assistant", content: content.slice(middle) }, done: true },
  ];
  return new Response(lines.map((line) => JSON.stringify(line)).join("\n") + "\n", {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
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

describe("parseStructuredQwenContent", () => {
  it("extracts a fenced JSON object surrounded by model prose", () => {
    const content = `분석 결과입니다.\n\`\`\`json\n{"documentSummary":"화면","screens":[]}\n\`\`\`\n검토해주세요.`;
    expect(parseStructuredQwenContent(content)).toEqual({ documentSummary: "화면", screens: [] });
  });

  it("repairs trailing commas without changing braces inside strings", () => {
    const content = `설명 {not-json}\n{"documentSummary":"{화면}","screens":[],}`;
    expect(parseStructuredQwenContent(content)).toEqual({ documentSummary: "{화면}", screens: [] });
  });

  it("rejects text that contains no complete JSON value", () => {
    expect(() => parseStructuredQwenContent("JSON이 아닌 설명문만 있음"))
      .toThrowError(/구조화된 결과/);
  });
});

describe("analyzeFPDocumentsLocally", () => {
  it("uses Qwen observation and judge passes and normalizes weights", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ndjsonOllamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(candidates))
      .mockResolvedValueOnce(ollamaResponse(candidates));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], {
      baseUrl: "http://qwen.local:11434",
      model: "qwen-test",
      fetchImpl,
    });

    expect(bundle.result.items[0]).toMatchObject({ fpType: "EI", weight: 4 });
    expect(bundle.observations).toEqual(observations);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://qwen.local:11434/api/chat");
    const first = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    const second = JSON.parse(String(fetchImpl.mock.calls[1][1].body));
    const third = JSON.parse(String(fetchImpl.mock.calls[2][1].body));
    expect(first).toMatchObject({ model: "qwen-test", think: false, stream: true });
    expect(second).toMatchObject({ model: "qwen-test", think: true, stream: true });
    expect(third).toMatchObject({ model: "qwen-test", think: true, stream: true });
    expect(first.messages[0].images[0]).not.toContain("data:image");
    expect(JSON.stringify(second)).toContain("가상자산 연결정보");
    expect(JSON.stringify(third)).toContain("독립 감리");
  });

  it("observes each image independently and binds evidence to the real filename", async () => {
    const firstObservation = {
      ...observations,
      documentSummary: "첫 화면",
      screens: [{ ...observations.screens[0], sourceRef: "hallucinated.png", screenName: "전체 투자 현황" }],
    };
    const secondObservation = {
      ...observations,
      documentSummary: "둘째 화면",
      screens: [{ ...observations.screens[0], sourceRef: "wrong.png", screenName: "가상자산 등록" }],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(firstObservation))
      .mockResolvedValueOnce(ollamaResponse(secondObservation))
      .mockResolvedValueOnce(ollamaResponse(candidates))
      .mockResolvedValueOnce(ollamaResponse(candidates));

    const bundle = await analyzeFPDocumentsLocally([pngFile("page-1.png"), pngFile("page-2.png")], {
      baseUrl: "http://qwen.local:11434",
      model: "qwen-test",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const calls = fetchImpl.mock.calls.map((call) => JSON.parse(String(call[1].body)));
    expect(calls[0].messages[0].images).toHaveLength(1);
    expect(calls[1].messages[0].images).toHaveLength(1);
    expect(calls[2].messages[0].images).toBeUndefined();
    expect(calls[3].messages[0].images).toBeUndefined();
    expect(bundle.observations.screens).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRef: "page-1.png", screenName: "전체 투자 현황" }),
      expect.objectContaining({ sourceRef: "page-2.png", screenName: "가상자산 등록" }),
    ]));
  });

  it("uses the independent audit as the final normalized decision", async () => {
    const audited = {
      ...candidates,
      items: [{ ...candidates.items[0], fpType: "EQ", weight: 999, confidence: 0.55, needsReview: true, rationale: "계산 근거가 없어 EO가 아닌 조회로 감리" }],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(candidates))
      .mockResolvedValueOnce(ollamaResponse(audited));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl });

    expect(bundle.result.items[0]).toMatchObject({ fpType: "EQ", weight: 3.9, confidence: 0.55, needsReview: true });
  });

  it("forces review when the audited candidate cites an unknown source", async () => {
    const ungrounded = {
      ...candidates,
      items: [{
        ...candidates.items[0],
        sourceRefs: ["missing.png"],
        triggerEvidence: ["버튼 선택"],
        outcomeEvidence: ["등록 완료"],
        readDataGroups: [],
        maintainedDataGroups: ["가상자산 연결정보"],
        derivationEvidence: [],
        ownershipEvidence: [],
      }],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(ungrounded))
      .mockResolvedValueOnce(ollamaResponse(ungrounded));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl });
    expect(bundle.result.items[0].needsReview).toBe(true);
    expect(bundle.result.items[0].reviewReasons).toContain("관찰 근거 출처 없음");
  });

  it("forces review when a short generic fragment is used as evidence", async () => {
    const weakEvidence = {
      ...candidates,
      items: [{
        ...candidates.items[0],
        sourceRefs: ["screen.png"],
        triggerEvidence: ["등록"],
        outcomeEvidence: [],
        readDataGroups: [],
        maintainedDataGroups: [],
        derivationEvidence: [],
        ownershipEvidence: [],
      }],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(weakEvidence))
      .mockResolvedValueOnce(ollamaResponse(weakEvidence));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl });
    expect(bundle.result.items[0].reviewReasons).toContain("관찰 JSON에 없는 판정 근거");
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

  it("distinguishes timeout, caller cancellation, and connection failures", async () => {
    const timeoutFetch = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl: timeoutFetch }))
      .rejects.toMatchObject({ status: 504 });

    const controller = new AbortController();
    controller.abort();
    const cancelledFetch = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl: cancelledFetch, signal: controller.signal }))
      .rejects.toMatchObject({ status: 499 });

    const connectionFetch = vi.fn().mockRejectedValue(new TypeError("socket closed"));
    await expect(analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl: connectionFetch }))
      .rejects.toMatchObject({ status: 502 });
  });

  it("repairs malformed structured output once without resending the image", async () => {
    const malformed = new Response(JSON.stringify({ message: { content: "분석은 했지만 JSON이 깨졌습니다 {" } }), { status: 200 });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(malformed)
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(candidates))
      .mockResolvedValueOnce(ollamaResponse(candidates));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl });

    expect(bundle.result.items[0].fpType).toBe("EI");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const repair = JSON.parse(String(fetchImpl.mock.calls[1][1].body));
    expect(repair.think).toBe(false);
    expect(repair.messages[0].images).toBeUndefined();
    expect(repair.messages[0].content).toContain("JSON 복구");
  });

  it("maps malformed Qwen output to a safe local error after one repair", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ message: { content: "not json" } }), { status: 200 }));
    await expect(analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl }))
      .rejects.toThrowError(/구조화된 결과/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
