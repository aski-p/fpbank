/**
 * FP (기능점수) 자동 판정 엔진
 * 
 * 키워드 기반 분석 → FP 유형(EQ/EI/EO/ILF/EIF) 자동 분류 + 가중치 할당
 */

// FP 기준 (IBK型 표준)
export const FP_WEIGHTS: Record<string, number> = {
  ILF: 7.5,  // Internal Logical File - 데이터 저장/원장
  EO: 5.2,   // External Output - 검증/처리 포함 출력
  EIF: 5.4,  // External Interface File - 타시스템 참조
  EI: 4.0,   // External Input - 등록/수정/삭제
  EQ: 3.9,   // External Inquiry - 단순 조회
};

export type FPType = keyof typeof FP_WEIGHTS;

export interface FPItem {
  id: string;
  appName: string;       // 애플리케이션명
  businessName: string;  // 세부 업무명
  processName: string;   // 단위프로세스명
  description: string;   // 설명 (기능명)
  fpType: FPType;        // 자동 분류된 유형
  weight: number;        // 할당된 가중치
  remark?: string;       // 비고
  included?: boolean;    // FP 합산 포함 여부
}

/**
 * 기능명/설명 분석 → FP 유형 자동 판정
 * 
 * 규칙: 기능명의 키워드 패턴에 따라 유형 분류 (우선순위 기반)
 */
export function classifyFPType(text: string): FPType {
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/서비스|기능|처리|전환/g, '');

  // EIF - 다른 애플리케이션/기관이 유지하는 데이터의 참조·연계가 명시된 경우만 허용
  if (/(타\s*(시스템|기관|회사|행)|외부\s*(시스템|기관|회사)).*(참조|조회|연계|관리|유지)|외부\s*인터페이스|\bEIF\b/i.test(cleaned)) {
    return 'EIF';
  }

  // ILF - 내부 논리 데이터/원장/저장소. 일반적인 "데이터" 명칭을 EIF로 추측하지 않는다.
  if (/(데이터|원장|저장소|상태\s*정보)\s*$/.test(cleaned)) {
    return 'ILF';
  }

  // EO - 검증/발송/처리 포함 출력 (우선순위: IO/EI보다 높음)
  if (/검증|발송|확인|처리|알림|푸시|반영|채취/.test(cleaned)) {
    return 'EO';
  }

  // EI - 등록/수정/삭제/해지/변경 등 CRUD 패턴
  if (/(등록|수정|삭|해지|변경|동의|거절|설정|가입)/.test(cleaned)) {
    return 'EI';
  }

  // EQ - 조회/확인 기본값 (남아있는 건 대부분 조회)
  if (/조회|확인|검색|출력|목록/.test(cleaned)) {
    return 'EQ';
  }

  // 기본값: EQ (단순 정보 확인이 가장 많음)
  return 'EQ';
}

/**
 * 단일 기능 추가 (자동 분류 + 가중치 할당)
 */
export function addItem(
  items: FPItem[],
  appName: string,
  businessName: string, 
  processName: string,
  description: string,
  remark?: string
): FPItem {
  const fpType = classifyFPType(description);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    appName,
    businessName,
    processName,
    description,
    fpType,
    weight: FP_WEIGHTS[fpType],
    remark,
  };
}

/**
 * FP 산정 결과 계산
 */
export interface FPResult {
  items: FPItem[];
  includedItems: FPItem[];
  totalFP: number;
  fpByType: Record<FPType, { count: number; totalFp: number }>;
  adjustedFP: number;
}

const ADJUSTMENT_COEFFICIENT = 0.6;
const ADJUSTED_SHARE = 0.43;
const BASE_SHARE = 0.57;

export function calculateFP(items: FPItem[]): FPResult {
  const includedItems = items.filter((item) => item.included !== false);
  const fpByType: Record<string, { count: number; totalFp: number }> = {};
  
  for (const type in FP_WEIGHTS) {
    const typedItems = includedItems.filter(i => i.fpType === type);
    fpByType[type] = {
      count: typedItems.length,
      totalFp: Math.round(typedItems.reduce((s, i) => s + i.weight, 0) * 10) / 10,
    };
  }

  const rawTotalFP = includedItems.reduce((sum, item) => sum + item.weight, 0);
  const totalFP = Math.round(rawTotalFP * 100) / 100;
  const adjustedFP = Math.round(rawTotalFP * (ADJUSTED_SHARE * ADJUSTMENT_COEFFICIENT + BASE_SHARE) * 100) / 100;

  return { items, includedItems, totalFP, fpByType: fpByType as Record<FPType, { count: number; totalFp: number }>, adjustedFP };
}

/** FP 유형 label/색상 */
export const FP_TYPE_LABELS: Record<string, string> = {
  ILF: '내부논리파일(ILF)',
  EIF: '외부인터페이스(EIF)', 
  EQ: '외부질의(EQ)',
  EI: '외부입력(EI)',
  EO: '외부출력(EO)',
};

export const FP_TYPE_COLORS: Record<string, string> = {
  ILF: '#3B82F6',
  EIF: '#10B981',
  EQ: '#F59E0B',
  EI: '#EF4444',
  EO: '#8B5CF6',
};
