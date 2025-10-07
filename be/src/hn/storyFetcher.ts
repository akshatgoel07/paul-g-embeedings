import { prisma } from "../db.ts";

export async function fetchAndStoreStories() {
  const url = "https://hacker-news.firebaseio.com";
  const batchSize = 5;
  const results = [];
  const len = 10;
  // const legnth = storyIds.length

  const topStoryIds = await fetch(`${url}/v0/topstories.json?print=pretty`);
  const storyIds: number[] = await topStoryIds.json();
  // console.log(storyIds);
  for (let i = 0; i < len; i += batchSize) {
    const ids = storyIds.slice(i, i + batchSize);
    const data = await Promise.all(
      ids.map(
        async (id) =>
          await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`,
          ),
      ),
    );

    results.push(...data);
  }
  console.log(results);
  // for each story id we will fetch the data and store it in db

  console.log("before for of loop");
  for (const storyId of storyIds) {
    // console.log(storyId);
    // storyId = 123423
    const storyPromise = await fetch(
      ` https://hacker-news.firebaseio.com/v0/item/${storyId}.json?print=pretty`,
    );
    const storyRes = await storyPromise.json();
    const url = storyRes?.url;
    console.log(storyRes, "storyRes");
    // const newStory = prisma.story.create({
    //   data: {
    //     id: storyId,
    //   },
    // });
    // dn call ?
  }
}
