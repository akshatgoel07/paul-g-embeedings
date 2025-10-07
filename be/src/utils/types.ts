interface Essays {
  title: string;
  description: string;
  content: string; // Raw HTML content
  cleanContent?: string; // Cleaned text content for embeddings
  pubDate?: string;
}
