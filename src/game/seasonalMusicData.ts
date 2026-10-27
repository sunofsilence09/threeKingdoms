export interface MusicTrack {id:string;name:string;src:string}
export type MusicSeason='spring'|'summer'|'autumn'|'winter';
export type MusicLibrary=Readonly<Record<MusicSeason,readonly MusicTrack[]>>;
/** Imported user music; duplicate bytes are represented once within each season. */
export const SEASONAL_MUSIC:MusicLibrary={
  "spring": [
    {
      "id": "spring-01",
      "name": "春日",
      "src": "/assets/music/spring-01.mp3"
    }
  ],
  "summer": [
    {
      "id": "summer-01",
      "name": "夏天",
      "src": "/assets/music/summer-01.mp3"
    }
  ],
  "autumn": [
    {
      "id": "autumn-01",
      "name": "秋风",
      "src": "/assets/music/autumn-01.mp3"
    }
  ],
  "winter": [
    {
      "id": "winter-01",
      "name": "东雪",
      "src": "/assets/music/winter-01.mp3"
    }
  ]
};
