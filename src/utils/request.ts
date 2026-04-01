import UserAgent from "user-agents";
import type { LangCodeGoogle } from "./language.js";

export const Endpoint = {
  INFO: "info",
  TEXT: "text",
  AUDIO: "audio",
} as const;

type EndpointType = (typeof Endpoint)[keyof typeof Endpoint];

type Params = {
  [Endpoint.INFO]: { body: string };
  [Endpoint.TEXT]: {
    source: LangCodeGoogle<"source">;
    target: LangCodeGoogle<"target">;
    query: string;
  };
  [Endpoint.AUDIO]: {
    lang: LangCodeGoogle<"target">;
    text: string;
    textLength: number;
    speed: number;
  };
};

// 🔥 Response types per endpoint (THE IMPORTANT PART)
type ResponseMap = {
  [Endpoint.INFO]: string;
  [Endpoint.TEXT]: string;
  [Endpoint.AUDIO]: ArrayBuffer;
};

// ─────────────────────────────────────────────
// Request builder
// ─────────────────────────────────────────────
const request = <T extends EndpointType>(endpoint: T, retry = 0) => ({
  with: (params: Params[T]) => {
    const promise: Promise<ResponseMap[T]> = retrieve(endpoint, params);

    return {
      promise,

      doing: <V>(
        callback: (data: ResponseMap[T]) => V | undefined,
      ): Promise<V | null> =>
        promise
          .then(callback)
          .catch(() => undefined)
          .then((result) =>
            isEmpty(result) && retry < 3
              ? request(endpoint, retry + 1)
                  .with(params)
                  .doing(callback)
              : (result ?? null),
          ),
    };
  },
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const isEmpty = (item: unknown): boolean => {
  if (item == null) return true;
  if (typeof item === "number" || typeof item === "boolean") return false;
  if (item instanceof Map || item instanceof Set) return item.size === 0;
  if (typeof item === "object") return Object.keys(item as object).length === 0;
  return !item;
};

// ─────────────────────────────────────────────
// Fetch logic (typed per endpoint)
// ─────────────────────────────────────────────
const retrieve = async <T extends EndpointType>(
  endpoint: T,
  params: Params[T],
): Promise<ResponseMap[T]> => {
  const ua = new UserAgent().toString();

  if (endpoint === Endpoint.INFO) {
    const { body } = params as Params[typeof Endpoint.INFO];

    const res = await fetch(
      "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&rt=c",
      {
        method: "POST",
        body,
        headers: {
          "User-Agent": ua,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return (await res.text()) as ResponseMap[T];
  }

  if (endpoint === Endpoint.TEXT) {
    const { source, target, query } = params as Params[typeof Endpoint.TEXT];

    const url = new URL("https://translate.google.com/m");
    url.searchParams.set("sl", source);
    url.searchParams.set("tl", target);
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": ua },
    });

    return (await res.text()) as ResponseMap[T];
  }

  if (endpoint === Endpoint.AUDIO) {
    const { lang, text, textLength, speed } =
      params as Params[typeof Endpoint.AUDIO];

    const url = new URL("https://translate.google.com/translate_tts");
    url.searchParams.set("tl", lang);
    url.searchParams.set("q", text);
    url.searchParams.set("textlen", textLength.toString());
    url.searchParams.set("speed", speed.toString());
    url.searchParams.set("client", "tw-ob");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": ua },
    });

    return (await res.arrayBuffer()) as ResponseMap[T];
  }

  throw new Error("Invalid endpoint");
};

export default request;
