import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze-fp/route";

const validObservation = {
  documentSummary: "회원 화면",
  applicationCandidates: [{ name: "Bank App", evidence: "앱 제목", confidence: 0.9 }],
  screens: [{
    sourceRef: "screen.jpg",
    screenName: "회원 등록",
    menuPath: "회원 > 등록",
    visibleTexts: ["등록"],
    actions: [{ label: "등록", trigger: "버튼 선택", observedOutcome: "등록 완료" }],
    dataGroups: [{ name: "회원", ownershipEvidence: "화면에서 불명확", maintainedHere: "unknown" }],
    notes: [],
  }],
};

const validResult = {
  documentSummary: "회원 화면",
  items: [{
    applicationName: "Bank App",
    businessName: "회원 관리",
    unitProcessName: "회원 정보 등록",
    fpType: "EI",
    weight: 999,
    confidence: 0.9,
    evidence: "등록 버튼",
    rationale: "데이터 유지 입력",
    needsReview: false,
  }],
};

function requestWith(file: File): Request {
  const form = new FormData();
  form.append("files", file);
  return new Request("http://localhost/api/analyze-fp", { method: "POST", body: form });
}

function modelResponse(result: unknown): Response {
  return new Response(JSON.stringify({
    output: [{ content: [{ type: "output_text", text: JSON.stringify(result) }] }],
  }), { status: 200, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_FP_MODEL;
});

describe("POST /api/analyze-fp", () => {
  it("rejects unsupported files before calling the model", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.OPENAI_API_KEY = "test-key";

    const response = await POST(requestWith(new File(["x"], "script.svg", { type: "image/svg+xml" })));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ code: "INVALID_FILES" });
  });

  it("returns 503 when the server key is not configured", async () => {
    const response = await POST(requestWith(new File(["x"], "screen.png", { type: "image/png" })));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "AI_NOT_CONFIGURED" });
  });

  it("returns normalized results without caching", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(modelResponse(validObservation))
      .mockResolvedValueOnce(modelResponse(validResult)));
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_FP_MODEL = "test-model";

    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
    const response = await POST(requestWith(new File([jpeg], "screen.jpg", { type: "image/jpeg" })));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    expect(body.items[0]).toMatchObject({ fpType: "EI", weight: 4.0 });
  });
});
