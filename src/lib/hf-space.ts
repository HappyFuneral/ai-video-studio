type Input = {
  prompt: string;
  mode: "text" | "image";
  image?: File;
};

const SPACE = process.env.HF_SPACE || "umer-un/prompt-to-video";

const API_NAME = process.env.HF_API_NAME || "/text_to_video";

const HF_TOKEN = process.env.HF_TOKEN;

function spaceHost(id: string): string {
  const parts = id.trim().split("/");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Hibás HF_SPACE azonosító: ${id}. Helyes formátum: tulajdonos/space-neve`,
    );
  }

  const host = `${parts[0]}-${parts[1]}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  return `https://${host}.hf.space`;
}

function authHeaders(): Record<string, string> {
  return HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
}

async function readError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return body.slice(0, 1500);
}

async function uploadImage(
  base: string,
  image: File,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("files", image, image.name || "input.png");

  const response = await fetch(`${base}/gradio_api/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      `Képfeltöltési hiba (${response.status}): ` + (await readError(response)),
    );
  }

  const uploaded = await response.json();

  const path = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (typeof path !== "string") {
    throw new Error("A Hugging Face nem adott vissza érvényes fájlútvonalat.");
  }

  return {
    path,
    meta: { _type: "gradio.FileData" },
    orig_name: image.name || "input.png",
  };
}

async function submitJob(
  base: string,
  endpoint: string,
  data: unknown[],
): Promise<string> {
  const response = await fetch(`${base}/gradio_api/call/${endpoint}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(
      `Hugging Face API hiba (${response.status}).\n` +
        `Space: ${SPACE}\n` +
        `Endpoint: /${endpoint}\n` +
        `Válasz: ${await readError(response)}`,
    );
  }

  const result = await response.json();

  if (!result.event_id) {
    throw new Error("A Space nem adott vissza event_id azonosítót.");
  }

  return result.event_id;
}

async function waitForResult(
  base: string,
  endpoint: string,
  eventId: string,
): Promise<unknown> {
  const response = await fetch(
    `${base}/gradio_api/call/${endpoint}/${eventId}`,
    {
      method: "GET",
      headers: authHeaders(),
      signal: AbortSignal.timeout(290000),
    },
  );

  if (!response.ok || !response.body) {
    throw new Error(
      `Nem sikerült lekérni a generálás eredményét (${response.status}).`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let result: unknown;
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const eventLine = chunk
        .split("\n")
        .find((line) => line.startsWith("event:"));

      const dataLine = chunk
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) continue;

      const eventName = eventLine ? eventLine.slice(6).trim() : "";

      const raw = dataLine.slice(5).trim();

      if (!raw) continue;

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      if (eventName === "error") {
        throw new Error(
          `A videógenerálás hibát jelzett: ${JSON.stringify(parsed)}`,
        );
      }

      if (eventName === "complete") {
        result = parsed;
        completed = true;
      }
    }
  }

  if (!completed) {
    throw new Error("A generálás nem küldött complete eseményt.");
  }

  return result;
}

function findVideo(value: unknown, base: string): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    if (/\.mp4(?:\?|$)/i.test(value)) {
      return `${base}/gradio_api/file=${encodeURIComponent(value)}`;
    }

    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVideo(item, base);
      if (found) return found;
    }

    return undefined;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (typeof obj.url === "string") {
      if (/^https?:\/\//i.test(obj.url)) {
        return obj.url;
      }

      if (/\.mp4(?:\?|$)/i.test(obj.url)) {
        return `${base}/gradio_api/file=${encodeURIComponent(obj.url)}`;
      }
    }

    if (typeof obj.path === "string") {
      const found = findVideo(obj.path, base);
      if (found) return found;
    }

    for (const item of Object.values(obj)) {
      const found = findVideo(item, base);
      if (found) return found;
    }
  }

  return undefined;
}

export async function submitToSpace(input: Input): Promise<string> {
  if (!input.prompt.trim()) {
    throw new Error("Írd be a videó leírását!");
  }

  const base = spaceHost(SPACE);
  const endpoint = API_NAME.replace(/^\/+/, "");

  let data: unknown[];

  if (input.mode === "image") {
    if (!input.image) {
      throw new Error("Image-to-Video módban tölts fel egy képet!");
    }

    const uploadedImage = await uploadImage(base, input.image);

    // A sorrendnek meg kell egyeznie
    // a Space API bemeneti paramétereinek sorrendjével.
    data = [input.prompt, uploadedImage];
  } else {
    data = [input.prompt];
  }

  const eventId = await submitJob(base, endpoint, data);

  const result = await waitForResult(base, endpoint, eventId);

  const videoUrl = findVideo(result, base);

  if (!videoUrl) {
    throw new Error(
      "A generálás befejeződött, de nem találtam videófájlt. " +
        "Ellenőrizd a Space API kimeneti formátumát.",
    );
  }

  return videoUrl;
}
