import { pdf } from "pdf-to-img";

export interface RenderedPdfPage {
  sourceRef: string;
  base64: string;
}

export const MAX_LOCAL_PDF_PAGES = 20;

export class PdfPageLimitError extends Error {
  readonly pageCount: number;

  constructor(pageCount: number) {
    super(`로컬 PDF 분석은 파일당 최대 ${MAX_LOCAL_PDF_PAGES}페이지까지 지원합니다. 현재 ${pageCount}페이지입니다.`);
    this.name = "PdfPageLimitError";
    this.pageCount = pageCount;
  }
}

export async function renderPdfPages(file: File): Promise<RenderedPdfPage[]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:application/pdf;base64,${bytes.toString("base64")}`;
  const document = await pdf(dataUrl, { scale: 1.5 });
  try {
    if (document.length > MAX_LOCAL_PDF_PAGES) throw new PdfPageLimitError(document.length);
    const pages: RenderedPdfPage[] = [];
    for (let page = 1; page <= document.length; page += 1) {
      const image = await document.getPage(page);
      pages.push({ sourceRef: `${file.name}#page=${page}`, base64: Buffer.from(image).toString("base64") });
    }
    return pages;
  } finally {
    await document.destroy();
  }
}
