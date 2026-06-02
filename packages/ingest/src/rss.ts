import axios from "axios";
import { parseStringPromise } from "xml2js";

const UA = "Mozilla/5.0 (compatible; paul-g-embeddings/0.1)";

export interface RssEssay {
  title: string;
  description: string;
  link: string;
}

export async function fetchEssays(rssUrl: string): Promise<RssEssay[]> {
  const { data } = await axios.get<string>(rssUrl, {
    headers: { "User-Agent": UA },
    timeout: 15000,
    responseType: "text",
  });
  const parsed = await parseStringPromise(data);
  const items: unknown[] = parsed?.rss?.channel?.[0]?.item ?? [];
  return items
    .map((raw) => {
      const it = raw as Record<string, string[] | undefined>;
      return {
        title: it.title?.[0] ?? "",
        description: it.description?.[0] ?? "",
        link: it.link?.[0] ?? "",
      };
    })
    .filter((e) => e.link.includes(".html")); // drop the feed's homepage entry
}

export async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    headers: { "User-Agent": UA },
    timeout: 20000,
    responseType: "text",
  });
  return data;
}
