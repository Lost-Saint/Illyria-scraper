import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request, { Endpoint } from "../utils/request.js";
import axios from "axios";

// Mock axios to avoid real network requests
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("request utilities integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("INFO endpoint", () => {
    it("should make proper POST requests to the info endpoint", async () => {
      const mockBody = "f.req=mockData";
      const mockResponse = {
        data: '\n\n\n[[[["wrb.fr","MkEWBc","mock data",null,null,null,"generic"]],["di",123],["af.httprm",123,"abcde",123]]]',
      };

      (axios.post as any).mockResolvedValue(mockResponse);

      const response = await request(Endpoint.INFO).with({ body: mockBody })
        .promise;

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc",
        ),
        mockBody,
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": expect.any(String),
          }),
        }),
      );
      expect(response).toEqual(mockResponse);
    });

    it("should process INFO endpoint data correctly", async () => {
      const mockResponse = {
        data: '\n\n\n[[[["wrb.fr","MkEWBc","[[\\"test\\",\\"en\\",\\"fr\\",true],null]",null,null,null,"generic"]],["di",123],["af.httprm",123,"abcde",123]]]',
      };

      (axios.post as any).mockResolvedValue(mockResponse);

      const result = await request(Endpoint.INFO)
        .with({ body: "f.req=mockData" })
        .doing(({ data }) => {
          return { processedData: data ? "processed" : "empty" };
        });

      expect(result).toEqual({ processedData: "processed" });
    });
  });

  describe("TEXT endpoint", () => {
    it("should make proper GET requests to the text endpoint", async () => {
      const mockResponse = {
        data: '<div class="result-container">Translated text</div>',
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      const response = await request(Endpoint.TEXT).with({
        source: "en",
        target: "fr",
        query: "test",
      }).promise;

      expect(axios.get).toHaveBeenCalledWith(
        "https://translate.google.com/m?sl=en&tl=fr&q=test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.any(String),
          }),
        }),
      );
      expect(response).toEqual(mockResponse);
    });

    it("should process TEXT endpoint data correctly", async () => {
      const mockResponse = {
        data: '<div class="result-container">Translated text</div>',
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      const result = await request(Endpoint.TEXT)
        .with({
          source: "en",
          target: "fr",
          query: "test",
        })
        .doing(({ data }) => {
          return data ? "processed" : "empty";
        });

      expect(result).toBe("processed");
    });
  });

  describe("AUDIO endpoint", () => {
    it("should make proper GET requests to the audio endpoint", async () => {
      const mockResponse = { data: new ArrayBuffer(8) };

      (axios.get as any).mockResolvedValue(mockResponse);

      const response = await request(Endpoint.AUDIO).with({
        lang: "fr",
        text: "bonjour",
        textLength: 7,
        speed: 1,
      }).promise;

      expect(axios.get).toHaveBeenCalledWith(
        "https://translate.google.com/translate_tts?tl=fr&q=bonjour&textlen=7&speed=1&client=tw-ob",
        expect.objectContaining({
          responseType: "arraybuffer",
          timeout: 60000,
          headers: expect.objectContaining({
            "User-Agent": expect.any(String),
          }),
        }),
      );
      expect(response).toEqual(mockResponse);
    });

    it("should process AUDIO endpoint data correctly", async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockUint8Array = new Uint8Array(mockArrayBuffer);
      mockUint8Array.set([1, 2, 3, 4, 5, 6, 7, 8]);

      const mockResponse = { data: mockArrayBuffer };

      (axios.get as any).mockResolvedValue(mockResponse);

      const result = await request(Endpoint.AUDIO)
        .with({
          lang: "fr",
          text: "bonjour",
          textLength: 7,
          speed: 1,
        })
        .doing(({ data }) => {
          return data ? "has data" : "no data";
        });

      expect(result).toBe("has data");
    });
  });

  describe("error handling and retries", () => {
    it("should handle network errors and retry", async () => {
      // Mock a network error for the first call, then succeed
      const networkError = new Error("Network Error");
      (networkError as any).request = {}; // Make it look like a network error

      (axios.get as any)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: '<div class="result-container">Retry worked</div>',
        });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await request(Endpoint.TEXT)
        .with({
          source: "en",
          target: "fr",
          query: "test",
        })
        .doing(({ data }) => {
          return data ? "success" : "failure";
        });

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(result).toBe("success");

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it("should handle empty results and retry", async () => {
      // First response is empty, second has data
      (axios.get as any)
        .mockResolvedValueOnce({ data: "" })
        .mockResolvedValueOnce({
          data: '<div class="result-container">Data on retry</div>',
        });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await request(Endpoint.TEXT)
        .with({
          source: "en",
          target: "fr",
          query: "test",
        })
        .doing(({ data }) => data || null);

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(result).toBe('<div class="result-container">Data on retry</div>');

      warnSpy.mockRestore();
    });

    it("should give up after max retries", async () => {
      // All requests fail with 500 error
      const serverError = new Error("Server Error");
      (serverError as any).response = { status: 500, data: "Server Error" };

      (axios.get as any).mockRejectedValue(serverError);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await request(Endpoint.TEXT)
        .with({
          source: "en",
          target: "fr",
          query: "test",
        })
        .doing(({ data }) => {
          return data ? "success" : "failure";
        });

      // Initial + 3 retries = 4 calls
      expect(axios.get).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(warnSpy).toHaveBeenCalledTimes(3);
      expect(result).toBeNull();

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  it("should throw error for invalid endpoint", async () => {
    // Use a try/catch approach instead of expect().rejects.toThrow()
    // because the error is thrown synchronously during the .with() call
    try {
      // @ts-ignore - Testing invalid endpoint
      await request("invalid" as Endpoint).with({}).promise;
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Invalid endpoint: invalid");
    }
  });
});
