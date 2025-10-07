import * as cheerio from "cheerio";

export function cleanHtmlContent(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript").remove();

  $("map, area, img[usemap], .nav-sidebar").remove();

  $('script[src*="turbifycdn"], script[src*="store.turbify"]').remove();

  const textChunks = $("td")
    .map((i, elem) => {
      const $td = $(elem);
      const text = $td.text().trim();
      // Skip small chunks and chunks that look like navigation or ads
      return text.length > 100 &&
        !text.includes("JavaScript must be enabled") &&
        !text.includes("Translation") &&
        !text.includes("Japanese") &&
        !text.includes("Spanish") &&
        !text.includes("Romanian") &&
        !text.includes("Chinese") &&
        !text.includes("Arabic") &&
        !text.includes("Thanks to") &&
        !text.match(/^\s*\d+\s*$/) // Skip page numbers
        ? text
        : null;
    })
    .get()
    .filter((text) => text !== null) as string[];

  if (textChunks.length > 0) {
    const content = textChunks.join("\n\n");
    return content ? cleanText(content) : "";
  }

  const bodyText = $("body").text();
  return bodyText ? cleanText(bodyText) : "";
}

/**
 * Cleans raw text by removing extra whitespace, line breaks, and normalizing content
 */
export function cleanText(text: string): string {
  return (
    text
      // Remove extra whitespace and normalize line breaks
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      // Remove common noise patterns
      .replace(/JavaScript must be enabled.*?to use this site\./gi, "")
      .replace(/Want to start a startup.*?Y Combinator\./gi, "")
      // Remove URLs and email addresses that might be noise
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/\S+@\S+\.\S+/g, "")
      // Remove page numbers, dates, and other metadata that might appear in footers
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "")
      .replace(/\b\d{1,2}:\d{2}\s*(AM|PM)?\b/gi, "")
      .replace(/Page \d+/gi, "")
      // Remove excessive punctuation
      .replace(/[.,!?;:]{2,}/g, ". ")
      // Remove leading/trailing whitespace and normalize
      .trim()
      // Remove any remaining HTML entities
      .replace(/&[a-zA-Z]+;/g, " ")
      // Final cleanup of multiple spaces
      .replace(/\s+/g, " ")
  );
}

/**
 * Extracts title and content from HTML, handling the specific structure of Paul Graham essays
 */
export function extractEssayContent(html: string): {
  title?: string;
  content: string;
} {
  const $ = cheerio.load(html);

  // Try to extract title from various possible locations
  let title = "";

  // Look for title in meta tags first
  title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="title"]').attr("content") ||
    $("title").text() ||
    // Fallback to h1 tags
    $("h1").first().text();

  // Clean the title
  title = cleanText(title).trim();

  // Get clean content
  const cleanContent = cleanHtmlContent(html);

  return {
    title: title || undefined,
    content: cleanContent,
  };
}
