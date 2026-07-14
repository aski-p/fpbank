# FPBank

화면설계 문서와 Excel 자료에서 기능점수(FP) 후보를 추출·검토하고 분석표로 관리하는 Next.js 애플리케이션입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
```

## 기능

- `.xlsx` / `.xls` 기능점수 Excel 가져오기
- 파일 크기 10MB, 첫 시트 10,000행 제한
- 화면 이미지 및 PDF 업로드 검증
- 로컬 Qwen 화면 관찰 → FP 판정 → 독립 감리
- `UNKNOWN` 및 근거 부족 후보 자동 합계 제외
- 기능 서명·데이터 그룹 기반 중복 제거
- 선택적 OpenAI 교차검증
- 단일 동시 실행 비동기 Job API

## 분석 환경변수

| 변수 | 설명 |
|---|---|
| `QWEN_API_BASE_URL` | Ollama 또는 SGLang OpenAI-compatible API base URL |
| `QWEN_API_MODE` | `ollama` 또는 `openai` |
| `QWEN_FP_MODEL` | FP 분석에 사용할 로컬 모델 이름 |
| `QWEN_API_TOKEN` | 선택적 Qwen Bearer token |
| `QWEN_STAGE_TIMEOUT_MS` | Qwen 단계별 제한, 60초~30분 범위 |
| `OPENAI_API_KEY` | cloud/auto 모드의 서버 전용 API key |
| `OPENAI_FP_MODEL` | cloud 교차검증 모델 |
| `FP_ANALYSIS_MEMORY_QUEUE_ENABLED` | production 단일 인스턴스에서만 메모리 queue를 명시적으로 활성화 |
| `FP_ANALYSIS_ALLOW_NON_BROWSER` | production에서 Origin 없는 worker/API 요청을 명시적으로 허용 |
| `FP_ANALYSIS_WORKER_BASE_URL` | Vercel이 전달할 별도 HTTPS worker 주소 |
| `FP_ANALYSIS_WORKER_SHARED_SECRET` | Vercel과 worker가 공유하는 16자 이상 secret |
| `FP_ANALYSIS_REQUIRE_WORKER_SECRET` | worker에서 공유 secret을 필수로 검증하려면 `true` |

API key와 access token을 `NEXT_PUBLIC_*` 변수에 넣지 마세요.

## 배포 안전 조건

### Vercel

`FP_ANALYSIS_MEMORY_QUEUE_ENABLED`를 **설정하지 마세요**.

Vercel에서는 요청이 서로 다른 isolate로 전달될 수 있으므로 process-local queue와 결과 저장소를 사용할 수 없습니다. 기본 production 설정에서는 다음처럼 안전하게 닫힙니다.

- `POST /api/analyze-fp` → `410 Gone`
- `POST /api/analyze-fp/jobs` → `503 ANALYSIS_WORKER_UNAVAILABLE`
- UI는 worker 미연결 상태를 표시하고 화면설계 분석 버튼을 비활성화
- Excel 분석과 기능 직접 추가는 계속 사용 가능

### 단일 self-hosted Node 인스턴스

내부망의 단일 인스턴스에서만 다음을 설정해 메모리 queue를 사용할 수 있습니다.

```bash
FP_ANALYSIS_MEMORY_QUEUE_ENABLED=true
FP_ANALYSIS_REQUIRE_WORKER_SECRET=true
FP_ANALYSIS_WORKER_SHARED_SECRET=<shared-secret>
QWEN_API_BASE_URL=http://sglang-host:30000/v1
QWEN_API_MODE=openai
QWEN_FP_MODEL=qwen3.6-35b-a3b-nvfp4
QWEN_API_TOKEN=<sglang-or-proxy-token>
npm start
```

이 모드는 process 재시작 시 대기·실행 작업이 사라지는 내부용 구성입니다.

### 공개 AI 분석 활성화 전 필수 구성

Vercel에서는 `FP_ANALYSIS_WORKER_BASE_URL`과 worker의 공유 secret을 설정하면 Job API를 별도 worker로 relay합니다. worker 자체는 단일 인스턴스 메모리 queue로 시작할 수 있지만, 공개 장기 운영에서는 다음 durable 구성으로 교체해야 합니다.

1. Redis/SQS 등 durable queue
2. object storage 기반 업로드 보관
3. 공유 job/result 저장소
4. 별도 supervised worker
5. 사용자·세션 인증과 job 소유권 검증
6. distributed rate limit과 quota
7. retry, cancellation, idempotency, queue observability

Job 조회에는 생성 시 발급된 별도 Bearer access token이 필요하며 완료·실패 결과는 10분 후 정리됩니다.
