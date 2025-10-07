import type { RssItem, EssayServiceResult } from "../utils/types.ts";
export declare class EssayService {
    fetchEssayContent(url: string): Promise<string>;
    processRssItem(item: RssItem): Promise<EssayServiceResult>;
    processAllEssays(): Promise<{
        total: number;
        processed: number;
        skipped: number;
        errors: number;
    }>;
    refreshEssayContent(link: string): Promise<EssayServiceResult>;
}
export declare const essayService: EssayService;
//# sourceMappingURL=essayService.d.ts.map