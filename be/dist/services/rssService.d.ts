import type { RssItem, RssFetchResult } from "../utils/types.ts";
export declare class RssService {
    fetchFeed(feedUrl: string): Promise<RssFetchResult>;
    fetchPaulGrahamEssays(): Promise<RssFetchResult>;
    extractTextFromArray(textArray: string[] | undefined): string;
    validateRssItem(item: RssItem): boolean;
}
export declare const rssService: RssService;
//# sourceMappingURL=rssService.d.ts.map