import { describe, expect, it, vi } from "vitest";
import {
  AnalysisConfigurationError,
  AnalysisUpstreamError,
  analyzeFPDocuments,
  fileToOpenAIContent,
} from "@/lib/fp-document-analyzer";

function pngFile(name = "screen.png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, { type: "image/png" });
}

function webpFile(name = "screen.webp"): File {
  return new File([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], name, { type: "image/webp" });
}

function cloudOptions(fetchImpl: typeof fetch) {
  return { apiKey: ["test", "key"].join("-"), fetchImpl };
}

function responsePayload(text: string) {
  return {
    output: [{
      type: "message",
      content: [{ type: "output_text", text }],
    }],
  };
}

const validObservationResult = {
  documentSummary: "계좌 조회 화면",
  applicationCandidates: [{ name: "i-ONE Bank", evidence: "상단 앱 제목", confidence: 0.95 }],
  screens: [{
    sourceRef: "screen.webp",
    screenName: "계좌 목록",
    menuPath: "뱅킹 > 계좌",
    visibleTexts: ["계좌 목록", "조회"],
    actions: [{ label: "조회", trigger: "조회 버튼 선택", observedOutcome: "계좌 목록 표시" }],
    dataGroups: [{ name: "계좌", ownershipEvidence: "유지 주체는 화면에서 확인 불가", maintainedHere: "unknown" }],
    notes: [],
  }],
};

const validModelResult = {
  documentSummary: "계좌 화면",
  items: [{
    applicationName: "i-ONE Bank",
    businessName: "계좌 관리",
    unitProcessName: "계좌 목록 조회",
    fpType: "EQ",
    weight: 900,
    confidence: 0.92,
    evidence: "계좌 목록과 조회 버튼",
    rationale: "파생 계산 없는 조회",
    needsReview: false,
  }],
};

describe("fileToOpenAIContent", () => {
  it("encodes an image as an input_image data URL", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "screen.png", { type: "image/png" });
    const content = await fileToOpenAIContent(file);
    expect(content).toEqual({
      type: "input_image",
      image_url: "data:image/png;base64,AQID",
      detail: "high",
    });
  });

  it("encodes a PDF as an input_file with a safe filename", async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], "../설계서.pdf", { type: "application/pdf" });
    const content = await fileToOpenAIContent(file);
    expect(content.type).toBe("input_file");
    if (content.type !== "input_file") throw new Error("expected PDF input_file content");
    expect(content.filename).toBe("설계서.pdf");
    expect(content.file_data).toBe("data:application/pdf;base64,JVBERg==");
  });
});

describe("analyzeFPDocuments", () => {
  it("extracts observations first, then classifies with strict schemas and normalizes weights", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(responsePayload(JSON.stringify(validObservationResult))), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(responsePayload(JSON.stringify(validModelResult))), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    const files = [webpFile()];

    const result = await analyzeFPDocuments(files, {
      apiKey: "test-key",
      model: "vision-test-model",
      fetchImpl,
    });

    expect(result.items[0].weight).toBe(3.9);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    const secondBody = JSON.parse(String(fetchImpl.mock.calls[1][1].body));
    expect(firstBody.model).toBe("vision-test-model");
    expect(firstBody.text.format).toMatchObject({ type: "json_schema", name: "fp_document_observations", strict: true });
    expect(JSON.stringify(firstBody)).toContain("data:image/webp;base64");
    expect(secondBody.text.format).toMatchObject({ type: "json_schema", name: "fp_document_analysis", strict: true });
    expect(JSON.stringify(secondBody)).toContain("계좌 목록 표시");
    expect(JSON.stringify(secondBody)).not.toContain("data:image/webp;base64");
    expect(firstBody.store).toBe(false);
    expect(secondBody.store).toBe(false);
  });

  it("binds cloud observation source refs to uploaded filenames", async () => {
    const hallucinated = {
      ...validObservationResult,
      screens: validObservationResult.screens.map((screen) => ({ ...screen, sourceRef: "made-up.webp" })),
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(responsePayload(JSON.stringify(hallucinated))), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(responsePayload(JSON.stringify(validModelResult))), { status: 200 }));

    await analyzeFPDocuments([webpFile("actual.webp")], cloudOptions(fetchImpl));
    const classificationBody = JSON.parse(String(fetchImpl.mock.calls[1][1].body));
    expect(JSON.stringify(classificationBody)).toContain("actual.webp");
    expect(JSON.stringify(classificationBody)).not.toContain("made-up.webp");
  });

  it("rejects an unknown cloud source ref when multiple files make it ambiguous", async () => {
    const hallucinated = {
      ...validObservationResult,
      screens: validObservationResult.screens.map((screen) => ({ ...screen, sourceRef: "made-up.webp" })),
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(responsePayload(JSON.stringify(hallucinated))), { status: 200 }),
    );

    await expect(analyzeFPDocuments(
      [webpFile("one.webp"), webpFile("two.webp")],
      cloudOptions(fetchImpl),
    )).rejects.toThrowError(/파일 출처/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a file whose bytes do not match its declared type", async () => {
    const fetchImpl = vi.fn();
    const disguised = new File(["not a png"], "screen.png", { type: "image/png" });
    await expect(analyzeFPDocuments([disguised], { apiKey: "key", fetchImpl }))
      .rejects.toThrowError(/파일 내용과 형식/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects missing server API configuration before making a request", async () => {
    const fetchImpl = vi.fn();
    const file = new File(["x"], "screen.png", { type: "image/png" });
    await expect(analyzeFPDocuments([file], { apiKey: "", fetchImpl }))
      .rejects.toBeInstanceOf(AnalysisConfigurationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps upstream failures to a safe error without leaking response details", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("secret upstream body", { status: 429 }));
    const file = pngFile();
    await expect(analyzeFPDocuments([file], { apiKey: "key", fetchImpl }))
      .rejects.toMatchObject({ status: 429, message: "AI 분석 서비스가 요청을 처리하지 못했습니다." });
  });

  it("rejects empty or malformed model output", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [] }), { status: 200 }));
    const file = pngFile();
    await expect(analyzeFPDocuments([file], { apiKey: "key", fetchImpl }))
      .rejects.toThrowError(/구조화된 분석 결과/);
  });
});
