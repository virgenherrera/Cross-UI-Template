interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type: "story" | "docs";
}

interface StorybookIndex {
  entries: Record<string, StoryEntry>;
}

export async function discoverStories(baseURL: string): Promise<StoryEntry[]> {
  const response = await fetch(`${baseURL}/index.json`);
  const index: StorybookIndex = await response.json();
  return Object.values(index.entries).filter((entry) => entry.type === "story");
}
