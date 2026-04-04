export interface ImageData {
  mimeType: string;
  base64Data: string;
}

export async function fetchImageAsBase64(imageUrl: string): Promise<ImageData> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image from URL (${response.status} ${response.statusText}): ${imageUrl}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  return { mimeType, base64Data };
}

export function parseStructuredRating(rawText: string): {
  rating: number;
  justification: string;
} {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse JSON from model response: ${rawText}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    rating: number;
    justification: string;
  };

  if (typeof parsed.rating !== "number" || typeof parsed.justification !== "string") {
    throw new Error(`Model response JSON missing required fields: ${jsonMatch[0]}`);
  }

  return parsed;
}

export const RATING_JSON_INSTRUCTION =
  'Rate this image. Respond ONLY with valid JSON in this exact format:\n{"rating": <number 1.0-5.0 with one decimal>, "justification": "<brief explanation>"}';
