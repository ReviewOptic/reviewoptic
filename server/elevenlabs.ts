import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";

const API_BASE = "https://api.elevenlabs.io/v1";
const tmpDir = path.join(process.cwd(), "uploads", "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

function headers() {
  return {
    "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    "Content-Type": "application/json",
  };
}

/**
 * Clone a voice from an audio file URL. Returns the ElevenLabs voice ID.
 */
export async function cloneVoice(audioUrl: string, name: string): Promise<string> {
  // Download the audio file
  const tmpPath = path.join(tmpDir, `${randomUUID()}.audio`);
  const audioRes = await fetch(audioUrl);
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);

  try {
    const form = new FormData();
    form.append("name", `ReviewOptic - ${name}`);
    form.append("description", "Auto-generated voice clone for review requests");
    form.append("files", new Blob([buffer]), "voice-sample.mp3");

    const res = await fetch(`${API_BASE}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs clone failed: ${err}`);
    }
    const data = await res.json();
    return data.voice_id;
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

/**
 * Delete a cloned voice from ElevenLabs.
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  await fetch(`${API_BASE}/voices/${voiceId}`, {
    method: "DELETE",
    headers: headers(),
  }).catch(() => {});
}

/**
 * Generate a short audio clip of `text` spoken in the given voice.
 * Returns the path to a temporary mp3 file.
 */
export async function generateNameAudio(voiceId: string, text: string): Promise<string> {
  const res = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${await res.text()}`);
  const outPath = path.join(tmpDir, `${randomUUID()}.mp3`);
  fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

/**
 * Stitch nameAudioPath to the front of sourceUrl (audio or video).
 * Returns path to the merged temporary file.
 */
export async function stitchNameToFront(
  nameAudioPath: string,
  sourceUrl: string,
  type: "audio" | "video"
): Promise<string> {
  // Download source file
  const ext = type === "audio" ? "mp3" : "mp4";
  const sourcePath = path.join(tmpDir, `${randomUUID()}.${ext}`);
  const srcRes = await fetch(sourceUrl);
  fs.writeFileSync(sourcePath, Buffer.from(await srcRes.arrayBuffer()));

  const outPath = path.join(tmpDir, `${randomUUID()}.${ext}`);

  if (type === "audio") {
    // Concatenate two audio files
    const listFile = path.join(tmpDir, `${randomUUID()}.txt`);
    fs.writeFileSync(listFile, `file '${nameAudioPath}'\nfile '${sourcePath}'`);
    execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath], { stdio: "pipe" });
    fs.unlink(listFile, () => {});
  } else {
    // For video: prepend a short black frame with the name audio, then the main video
    // Step 1: get duration of name audio
    const durationOut = execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", nameAudioPath
    ]).toString().trim();
    const nameDuration = parseFloat(durationOut) || 1.5;

    // Step 2: create a black video clip the length of the name audio
    const blackClip = path.join(tmpDir, `${randomUUID()}.mp4`);
    execFileSync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=25", "-i", nameAudioPath,
      "-shortest", "-c:v", "libx264", "-c:a", "aac", blackClip
    ], { stdio: "pipe" });

    // Step 3: ensure source video has audio track
    const sourceWithAudio = path.join(tmpDir, `${randomUUID()}.mp4`);
    execFileSync("ffmpeg", ["-y", "-i", sourcePath, "-c:v", "copy", "-c:a", "aac", sourceWithAudio], { stdio: "pipe" });

    // Step 4: concat black clip + source video
    const listFile = path.join(tmpDir, `${randomUUID()}.txt`);
    fs.writeFileSync(listFile, `file '${blackClip}'\nfile '${sourceWithAudio}'`);
    execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath], { stdio: "pipe" });
    fs.unlink(listFile, () => {});
    fs.unlink(blackClip, () => {});
    fs.unlink(sourceWithAudio, () => {});
  }

  fs.unlink(nameAudioPath, () => {});
  fs.unlink(sourcePath, () => {});
  return outPath;
}
