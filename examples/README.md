# Compatibility fixtures

`tns-2xko-36-chapters.json` is a deterministic ChapterBuilder export based on public tournament data:

- VOD: https://youtu.be/un-_oJrC-RI
- Event: https://www.start.gg/tournament/tns-2xko-36/events
- Recorded VOD duration: `03:09:51`

The chapter starts come from the VOD's published timestamps. Each end is the next published start;
the Grand Final ends at the recorded VOD duration. Later-round player names are cross-checked against
the public Top 8 bracket. The file contains no downloaded media, contact details, or private tournament
data.

Game-specific details remain inside `name` and `outputName`. The exported JSON uses only VidChopper's
game-neutral ChapterFile schema fields.
