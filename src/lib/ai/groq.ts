import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function transcribe(audioBuffer: Buffer): Promise<string | null> {
  try {
    const uint8 = new Uint8Array(audioBuffer);
    const file = new File([uint8], "audio.ogg", { type: "audio/ogg" });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
    });

    return transcription.text?.trim() || null;
  } catch (error) {
    console.error("Groq transcription error:", error);
    return null;
  }
}
