import { describe, expect, it, vi } from "vitest";
import {
  LocalAnalysisConfigurationError,
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

function openAIResponse(value: unknown): Response {
  return new Response(JSON.stringify({
    choices: [{
      finish_reason: "stop",
      message: { role: "assistant", content: JSON.stringify(value) },
    }],
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
  it("uses the SGLang OpenAI multimodal and strict structured-output contract", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(openAIResponse(observations))
      .mockResolvedValueOnce(openAIResponse(candidates))
      .mockResolvedValueOnce(openAIResponse(candidates));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], {
      baseUrl: "http://qwen.local:30000/v1",
      model: "qwen3.6-35b-a3b-nvfp4",
      apiMode: "openai",
      apiToken: "test-sglang-token",
      fetchImpl,
    });

    expect(bundle.result.items[0]).toMatchObject({ fpType: "EI", weight: 4 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      "http://qwen.local:30000/v1/chat/completions",
      "http://qwen.local:30000/v1/chat/completions",
      "http://qwen.local:30000/v1/chat/completions",
    ]);
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get("authorization")).toBe("Bearer test-sglang-token");

    const observationRequest = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    expect(observationRequest).toMatchObject({
      model: "qwen3.6-35b-a3b-nvfp4",
      stream: false,
      chat_template_kwargs: { enable_thinking: false },
      response_format: { type: "json_schema", json_schema: { strict: true } },
    });
    expect(observationRequest.messages[0].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({
        type: "image_url",
        image_url: { url: expect.stringMatching(/^data:image\/png;base64,/) },
      }),
    ]));

    for (const call of fetchImpl.mock.calls.slice(1)) {
      const request = JSON.parse(String(call[1].body));
      expect(request.chat_template_kwargs).toEqual({ enable_thinking: true });
      expect(JSON.stringify(request.messages)).not.toContain("image_url");
    }
  });

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

  it("corrects EIF to ILF when the observed data group is maintained locally", async () => {
    const misclassified = {
      ...candidates,
      items: [{
        ...candidates.items[0],
        fpType: "EIF",
        sourceRefs: ["screen.png"],
        readDataGroups: ["가상자산 연결정보"],
        maintainedDataGroups: [],
        ownershipEvidence: ["등록·수정·삭제 화면"],
      }],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(misclassified))
      .mockResolvedValueOnce(ollamaResponse(misclassified));

    const bundle = await analyzeFPDocumentsLocally([pngFile()], { baseUrl: "http://qwen.local", fetchImpl });

    expect(bundle.result.items[0]).toMatchObject({ fpType: "ILF", weight: 7.5, needsReview: true });
    expect(bundle.result.items[0].maintainedDataGroups).toContain("가상자산 연결정보");
    expect(bundle.result.items[0].reviewReasons).toContain("관찰 소유권에 따라 EIF를 ILF로 교정");
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

  it("renders PDF pages and binds evidence to page-qualified source references", async () => {
    const pdfFile = new File(["%PDF-1.7"], "design.pdf", { type: "application/pdf" });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ollamaResponse(observations))
      .mockResolvedValueOnce(ollamaResponse(candidates))
      .mockResolvedValueOnce(ollamaResponse(candidates));
    const pdfRenderer = vi.fn().mockResolvedValue([
      { sourceRef: "design.pdf#page=1", base64: "iVBORw0KGgo=" },
    ]);

    const bundle = await analyzeFPDocumentsLocally([pdfFile], {
      baseUrl: "http://qwen.local",
      fetchImpl,
      pdfRenderer,
    });

    expect(pdfRenderer).toHaveBeenCalledWith(pdfFile);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(bundle.observations.screens[0].sourceRef).toBe("design.pdf#page=1");
    const request = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    expect(request.messages[0].content).toContain("design.pdf#page=1");
    expect(request.messages[0].images).toEqual(["iVBORw0KGgo="]);
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
