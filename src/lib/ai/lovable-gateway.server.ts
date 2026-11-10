/** Gateway adapter; SDK credentials are read only inside server execution. */
import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
import type { GeminiChatFields } from "@lovable.dev/ai-gateway";
import { LlmUnavailableError, type LlmProvider } from "./provider";

export function createLlmProvider(): LlmProvider {
  async function call(fields: GeminiChatFields): Promise<string> {
    try {
      const result = await generateChatCompletion({ model: "google/gemini-3.7-flash", ...fields }, {
        signal: AbortSignal.timeout(20000),
      });
      const content = result.choices[0]?.message.content;
      if (!content || typeof content !== "string") throw new LlmUnavailableError("Resposta vazia da interpretação.");
      return content;
    } catch (error) {
      if (error instanceof GatewayError) {
        // Status/correlation only: no prompts, transcripts, credentials or provider response body.
        console.error("[sombra] interpretação", { code: error.code, status: error.httpStatus, ids: error.ids });
        throw new LlmUnavailableError("Interpretação indisponível; nenhum tratamento foi inferido.", error.httpStatus);
      }
      throw error;
    }
  }
  return {
    async generateJson(request) {
      return JSON.parse(await call({
        messages: request.messages,
        max_tokens: request.maxTokens ?? 700,
        response_format: { type: "json_schema", json_schema: {
          name: request.schemaName, strict: true, schema: request.jsonSchema,
        } },
      })) as unknown;
    },
    async generateText(request) {
      return (await call({ messages: request.messages, max_tokens: request.maxTokens ?? 700 })).trim();
    },
  };
}
