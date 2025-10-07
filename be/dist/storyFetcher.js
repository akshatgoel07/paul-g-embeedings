import { prisma } from "./db.js";
export async function fetchAndStoreStories() {
    const url = "https://hacker-news.firebaseio.com";
    const topStoryIds = await fetch(`${url}/v0/topstories.json?print=pretty`);
    const storyIds = await topStoryIds.json();
    console.log(storyIds);
}
//# sourceMappingURL=storyFetcher.js.map