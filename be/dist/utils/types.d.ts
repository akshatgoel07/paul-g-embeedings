export interface RssItem {
    title: string[];
    link: string[];
    description?: string[];
    pubDate?: string[];
    guid?: string[];
}
export interface RssChannel {
    title: string[];
    description: string[];
    link: string[];
    item: RssItem[];
}
export interface RssFeed {
    rss: {
        channel: RssChannel[];
    };
}
export interface Essay {
    id: number;
    title: string;
    description: string;
    content: string;
    link: string;
}
export interface EssayServiceResult {
    success: boolean;
    essay?: Essay;
    error?: string;
}
export interface RssFetchResult {
    success: boolean;
    items?: RssItem[];
    error?: string;
}
//# sourceMappingURL=types.d.ts.map