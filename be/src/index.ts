import { promisify } from "util";
import { parseString } from "xml2js";
import axios from "axios";
import { prisma } from "./db.ts";
import {
  cleanHtmlContent,
  extractEssayContent,
} from "./utils/contentCleaner.js";

async function main() {
  const xml = await fetchRssFeed(
    "http://www.aaronsw.com/2002/feeds/pgessays.rss",
  );
  const rss = await parseRSStoEssays(xml);
}

main();

const parseXML = promisify(parseString);

async function fetchRssFeed(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    timeout: 10000,
  });
  return response.data;
}

async function parseRSStoEssays(xmlData: string) {
  const result = await parseXML(xmlData);
  const items = result.rss.channel[0].item;
  // console.log(`Found ${items.length} essays in RSS feed`);

  for (const essay of items) {
    const exists = await prisma.essays.findUnique({
      where: { link: essay.link[0] },
    });

    if (!exists) {
      console.log(`Processing new essay: ${essay.title[0]}`);

      const htmlContent = await fetchEssayContent(essay.link[0]);
      const cleanedContent = cleanHtmlContent(htmlContent);

      console.log(
        `Original content length: ${htmlContent.length}, Cleaned content length: ${cleanedContent.length}`,
      );

      const res = await prisma.essays.create({
        data: {
          title: essay.title[0],
          description: essay.description ? essay.description[0] : "",
          content: htmlContent,
          cleanContent: cleanedContent,
          link: essay.link[0],
        },
      });
      console.log(`Saved essay: ${res.title}`);
    } else {
      console.log(`Essay already exists: ${essay.title[0]}`);

      if (!exists.cleanContent) {
        console.log(
          `Updating existing essay with cleaned content: ${essay.title[0]}`,
        );
        const cleanedContent = cleanHtmlContent(exists.content);

        await prisma.essays.update({
          where: { id: exists.id },
          data: {
            cleanContent: cleanedContent,
          },
        });
        console.log(`Updated essay with cleaned content`);
      }
    }
  }
}

async function fetchEssayContent(url: string) {
  const res = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });
  return res.data;
}
// async function fetchAndSaveEssayContent(url: string) {
//   try {
//     const res = await axios.get(url, {
//       headers: {
//         "User-Agent": "Mozilla/5.0",
//       },
//       timeout: 10000,
//     });
//     const htmlContent = res.data;

//     const existingEssay = await prisma.essays.findUnique({
//       where: { link: url },
//     });

//     if (existingEssay) {
//       const updatedEssay = await prisma.essays.update({
//         where: { link: url },
//         data: { content: htmlContent },
//       });
//       console.log(`Updated essay content: ${updatedEssay.title}`);
//     }
//   } catch (error) {
//     console.error(`Error fetching essay content: ${error}`);
//   }
// }
