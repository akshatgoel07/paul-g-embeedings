import { promisify } from "util";
import { parseString } from "xml2js";
import axios from "axios";
import { prisma } from "./db.ts";

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
  console.log(items, "result");

  for (const essay of items) {
    const exists = await prisma.essays.findUnique({
      where: { link: essay.link[0] },
    });
    console.log(exists, "exists");

    const htmlContent = await fetchEssayContent(essay.link[0]);

    if (!exists) {
      const res = await prisma.essays.create({
        data: {
          title: essay.title[0],
          description: "",
          content: htmlContent,
          link: essay.link[0],
        },
      });
      console.log(res, "res");
    } else {
      console.log(`Essay already exists: ${essay.title[0]}`);
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
