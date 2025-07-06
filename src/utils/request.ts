import axios, { type AxiosResponse, type AxiosError } from "axios";
import UserAgent from "user-agents";
import type { LangCodeGoogle } from "./language.js";

export const Endpoint = {
  INFO: "info",
  TEXT: "text",
  AUDIO: "audio",
} as const;

type EndpointType = (typeof Endpoint)[keyof typeof Endpoint];

/**
 * Type definitions for parameters required by each endpoint
 */
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

/**
 * Creates a request handler for a specific endpoint with built-in retry capabilities
 *
 * @param endpoint - The API endpoint to call
 * @param retry - Current retry attempt number (used internally)
 * @returns An object with methods to execute the request
 */
const request = <T extends EndpointType>(endpoint: T, retry: number = 0) => ({
  with: (params: Params[T]) => {
    const promise = retrieve(endpoint, params);
    return {
      promise,
      /**
       * Executes a callback with the response data and handles errors/retries
       *
       * @param callback - Function to process the API response
       * @returns Promise resolving to the callback result or null on failure
       */
      doing: <V>(
        callback: (res: AxiosResponse) => V | undefined,
      ): Promise<V | null> =>
        promise
          .then((response) => {
            const result = callback(response);

            // Check if result is empty and we haven't exceeded max retries
            if (isEmpty(result) && retry < 3) {
              console.warn(
                `Empty result for ${endpoint}, retrying (${retry + 1}/3)`,
              );
              return request(endpoint, retry + 1)
                .with(params)
                .doing(callback);
            }

            return result ?? null;
          })
          .catch((error: AxiosError) => {
            if (error.response) {
              console.error(
                `${endpoint} failed:`,
                error.response.status,
                error.response.data,
              );
            } else if (error.request) {
              console.error(`${endpoint} network error:`, error.message);
            } else {
              console.error(`${endpoint} error:`, error.message);
            }

            // Only retry for network errors or 5xx status codes
            const shouldRetry = !error.response || error.response.status >= 500;

            if (shouldRetry && retry < 3) {
              console.warn(`Retrying ${endpoint} after error (${retry + 1}/3)`);
              return request(endpoint, retry + 1)
                .with(params)
                .doing(callback);
            }

            return null;
          }),
    };
  },
});

const isEmpty = (item: any) =>
  !item || (Array.isArray(item) && item.length === 0);

/**
 * Makes the actual HTTP request to the specified endpoint
 *
 * @param endpoint - The API endpoint to call
 * @param params - Parameters required by the endpoint
 * @returns Promise resolving to the API response
 * @throws Error if an invalid endpoint is provided
 */
const retrieve = <T extends EndpointType>(endpoint: T, params: Params[T]) => {
  const userAgent = new UserAgent().toString();
  const baseConfig = {
    headers: { "User-Agent": userAgent },
    timeout: 30000,
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
      `https://translate.google.com/m?sl=${source}&tl=${target}&q=${encodeURIComponent(query)}`,
      baseConfig,
    );
  }

  if (endpoint === Endpoint.AUDIO) {
    const { lang, text, textLength, speed } =
      params as Params[typeof Endpoint.AUDIO];
    return axios.get(
      `https://translate.google.com/translate_tts?tl=${lang}&q=${encodeURIComponent(text)}&textlen=${textLength}&speed=${speed}&client=tw-ob`,
      {
        ...baseConfig,
        responseType: "arraybuffer",
        timeout: 60000, // Audio needs more time
      },
    );
  }

  throw new Error(`Invalid endpoint: ${endpoint}`);
};

export default request;
