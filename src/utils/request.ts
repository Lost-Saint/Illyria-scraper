import axios, { type AxiosResponse, type AxiosError } from "axios";
import UserAgent from "user-agents";
import type { LangCodeGoogle } from "./language.js";

export const Endpoint = {
  INFO: "info",
  TEXT: "text",
  AUDIO: "audio",
} as const;

type EndpointType = (typeof Endpoint)[keyof typeof Endpoint];

type Params = {
  [Endpoint.INFO]: {
    body: string;
  };
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

const handleAxiosError = (
  error: AxiosError,
  endpoint: EndpointType,
  retry: number,
): Error => {
  let errorMessage = `Request failed for ${endpoint} endpoint`;

  if (error.response) {
    const { status, statusText, data } = error.response;
    errorMessage = `Server error (${status}): ${statusText}`;
    console.error("Response error:", {
      endpoint,
      status,
      statusText,
      data,
      headers: error.response.headers,
      retry,
    });
    if (status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (status === 403) {
      errorMessage = "Access forbidden. Check your permissions.";
    } else if (status === 404) {
      errorMessage = "Resource not found.";
    } else if (status >= 500) {
      errorMessage = "Server error. Please try again.";
    }
  } else if (error.request) {
    errorMessage = "No response received from server";
    console.error("Request error:", {
      endpoint,
      request: error.request,
      retry,
    });
  } else {
    errorMessage = `Request setup error: ${error.message}`;
    console.error("Setup error:", {
      endpoint,
      message: error.message,
      retry,
    });
  }

  console.error("Request config:", error.config);

  return new Error(errorMessage);
};

const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) return true;
  const { status } = error.response;
  return status >= 500 || status === 429;
};

const request = <T extends EndpointType>(endpoint: T, retry: number = 0) => ({
  with: (params: Params[T]) => {
    const promise = retrieve(endpoint, params);
    return {
      promise,
      doing: <V>(
        callback: (res: AxiosResponse) => V | undefined,
      ): Promise<V | null> =>
        promise
          .then(callback)
          .catch((error: AxiosError) => {
            const handledError = handleAxiosError(error, endpoint, retry);
            if (isRetryableError(error) && retry < 3) {
              console.log(
                `Retrying ${endpoint} request (attempt ${retry + 1}/3)`,
              );
              return request(endpoint, retry + 1)
                .with(params)
                .doing(callback);
            }
            throw handledError;
          })
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

const isEmpty = (item: any) =>
  !item || (typeof item === "object" && "length" in item && item.length <= 0);

const retrieve = <T extends EndpointType>(endpoint: T, params: Params[T]) => {
  const baseConfig = {
    timeout: 10000,
    validateStatus: (status: number) => status < 500,
    headers: {
      "User-Agent": new UserAgent().toString(),
    },
  };

  if (endpoint === Endpoint.INFO) {
    const { body } = params as Params[typeof Endpoint.INFO];
    return axios.post(
      "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&rt=c",
      body,
      {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
  }

  if (endpoint === Endpoint.TEXT) {
    const { source, target, query } = params as Params[typeof Endpoint.TEXT];
    return axios.get(
      `https://translate.google.com/m?sl=${source}&tl=${target}&q=${query}`,
      baseConfig,
    );
  }

  if (endpoint === Endpoint.AUDIO) {
    const { lang, text, textLength, speed } =
      params as Params[typeof Endpoint.AUDIO];
    return axios.get(
      `https://translate.google.com/translate_tts?tl=${lang}&q=${text}&textlen=${textLength}&speed=${speed}&client=tw-ob`,
      {
        ...baseConfig,
        responseType: "arraybuffer",
      },
    );
  }

  throw new Error("Invalid endpoint");
};

export default request;
