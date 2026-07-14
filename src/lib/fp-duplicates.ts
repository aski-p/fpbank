import type { FPItem } from "@/stores/fp-store";

export interface DuplicateCandidate {
  groupId: string;
  reason: string;
  similarity: number;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]+/g, "");
}

function bigrams(value: string): Set<string> {
  const normalized = normalize(value);
  if (normalized.length < 2) return new Set(normalized ? [normalized] : []);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
}

function dice(left: string, right: string): number {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return 2 * intersection / (a.size + b.size);
}

function duplicatePair(left: FPItem, right: FPItem): { reason: string; similarity: number } | undefined {
  if (left.fpType !== right.fpType) return undefined;
  if (normalize(left.appName) !== normalize(right.appName)) return undefined;

  const businessSimilarity = dice(left.businessName, right.businessName);
  const processSimilarity = dice(left.processName || left.description, right.processName || right.description);
  const descriptionSimilarity = dice(left.description, right.description);
  const exactProcess = normalize(left.processName || left.description) === normalize(right.processName || right.description);
  const exactBusiness = normalize(left.businessName) === normalize(right.businessName);

  if (exactBusiness && exactProcess) return { reason: "업무·프로세스명이 동일함", similarity: 1 };
  if (businessSimilarity >= 0.68 && processSimilarity >= 0.76) {
    return { reason: "업무·프로세스명이 매우 유사함", similarity: Math.min(businessSimilarity, processSimilarity) };
  }
  if (businessSimilarity >= 0.68 && descriptionSimilarity >= 0.82) {
    return { reason: "업무와 기능 설명이 매우 유사함", similarity: Math.min(businessSimilarity, descriptionSimilarity) };
  }
  return undefined;
}

export function detectDuplicateCandidates(items: FPItem[]): Map<string, DuplicateCandidate> {
  const parent = items.map((_, index) => index);
  const reasons = new Map<string, { reason: string; similarity: number }>();
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]];
      cursor = parent[cursor];
    }
    return cursor;
  };
  const union = (left: number, right: number) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[b] = a;
  };

  const compared = new Set<string>();
  const considerPair = (left: number, right: number) => {
    if (left === right) return;
    const [a, b] = left < right ? [left, right] : [right, left];
    const key = `${a}:${b}`;
    if (compared.has(key)) return;
    compared.add(key);
    const match = duplicatePair(items[a], items[b]);
    if (!match) return;
    union(a, b);
    reasons.set(key, match);
  };

  const exactProcessBuckets = new Map<string, number[]>();
  const businessBuckets = new Map<string, number[]>();
  items.forEach((item, index) => {
    const appType = `${normalize(item.appName)}|${item.fpType}`;
    const process = normalize(item.processName || item.description);
    const business = normalize(item.businessName);
    const exactKey = `${appType}|${process}`;
    const businessKey = `${appType}|${business}`;
    exactProcessBuckets.set(exactKey, [...(exactProcessBuckets.get(exactKey) ?? []), index]);
    businessBuckets.set(businessKey, [...(businessBuckets.get(businessKey) ?? []), index]);
  });

  // Exact process duplicates are connected through adjacent members; this is enough
  // to form one component without comparing every pair in a large Excel sheet.
  for (const members of exactProcessBuckets.values()) {
    for (let index = 1; index < members.length; index += 1) considerPair(members[index - 1], members[index]);
  }

  // Similar strings sort near each other. Compare only a bounded neighborhood so
  // duplicate hints remain responsive with thousands of Excel rows.
  const NEIGHBOR_WINDOW = 12;
  for (const members of businessBuckets.values()) {
    members.sort((left, right) => normalize(items[left].processName || items[left].description)
      .localeCompare(normalize(items[right].processName || items[right].description), "ko-KR"));
    for (let position = 0; position < members.length; position += 1) {
      for (let offset = 1; offset <= NEIGHBOR_WINDOW && position + offset < members.length; offset += 1) {
        considerPair(members[position], members[position + offset]);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let index = 0; index < items.length; index += 1) {
    const root = find(index);
    const members = groups.get(root) ?? [];
    members.push(index);
    groups.set(root, members);
  }

  const result = new Map<string, DuplicateCandidate>();
  let groupNumber = 0;
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    groupNumber += 1;
    const groupId = `D${groupNumber}`;
    for (const member of members) {
      let best = { reason: "중복 가능성이 있는 기능", similarity: 0 };
      for (const other of members) {
        if (member === other) continue;
        const key = member < other ? `${member}:${other}` : `${other}:${member}`;
        const match = reasons.get(key);
        if (match && match.similarity >= best.similarity) best = match;
      }
      result.set(items[member].id, { groupId, ...best });
    }
  }
  return result;
}
