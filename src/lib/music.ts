export interface MusicTrack {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  previewUrl: string;
  isExplicit: boolean;
  durationMillis: number; // 노래 길이 추가
}

export interface Song extends MusicTrack {
  id: string;
  createdAt: any;
}

export async function searchMusic(query: string): Promise<MusicTrack[]> {
  const ITUNES_URL = "https://itunes.apple.com/search";
  
  try {
    const response = await fetch(
      `${ITUNES_URL}?term=${encodeURIComponent(query)}&entity=song&limit=20&country=kr&explicit=Yes`
    );

    if (!response.ok) {
      throw new Error("iTunes API request failed");
    }

    const data = await response.json();

    return data.results.map((item: any) => ({
      trackId: item.trackId.toString(),
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      thumbnail: item.artworkUrl100.replace("100x100", "300x300"),
      previewUrl: item.previewUrl,
      isExplicit: item.trackExplicitness === "explicit",
      durationMillis: item.trackTimeMillis, // 밀리초 단위 길이
    }));
  } catch (error) {
    console.error("Error searching music:", error);
    return [];
  }
}

export async function getMusicDuration(trackId: string): Promise<number> {
  const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup";
  
  try {
    const response = await fetch(`${ITUNES_LOOKUP_URL}?id=${trackId}&country=kr`);
    if (!response.ok) throw new Error("Lookup failed");
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].trackTimeMillis || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching duration:", error);
    return 0;
  }
}
