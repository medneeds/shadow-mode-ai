/**
 * Implementação do LlmProvider sobre o Lovable AI Gateway.
 * Server-only: a credencial nunca chega ao navegador.
 */
import {
  LlmUnavailableError,
  type LlmJsonRequest,
  type LlmProvider,
  type LlmTextRequest,
} from "./provider";

type GatewayChoice = { message?: { content?: string | null } };
type GatewayResponse = { choices?: GatewayChoice[]; error?: { message?: string } };

function baseUrl(): string {
  return process.env["SHADOW_LLM_BASE_URL"] ?? "https://ai.gateway.lovable.dev/v1";
}

function modelId(): string {
  return process.env["SHADOW_LLM_MODEL"] ?? "google/gemini-3.7-flash";
}

export function createLlmProvider(): LlmProvider {
  const apiKey: string = process.env["LOVABLE_API_KEY"] ?? "";
  if (!apiKey) {
    throw new LlmUnavailableError("LOVABLE_API_KEY ausente no ambiente do servidor.");
  }
  const model = modelId();

  async function call(body: Record<string, unknown>): Promise<string> {
    const response = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({ model, ...body }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new LlmUnavailableError(
        `Gateway respondeu ${response.status}: ${detail.slice(0, 300)}`,
        response.status,
      );
    }

    const json = (await response.json()) as GatewayResponse;
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmUnavailableError(json.error?.message ?? "Resposta vazia do gateway.");
    }
    return content;
  }

  return {
    async generateJson(request: LlmJsonRequest) {
      const content = await call({
        messages: request.messages,
        max_tokens: request.maxTokens ?? 700,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: request.jsonSchema,
          },
        },
      });
      try {
        return JSON.parse(content) as unknown;
      } catch {
        throw new LlmUnavailableError("Saída estruturada inválida (JSON não parseável).");
      }
    },

    async generateText(request: LlmTextRequest) {
      const content = await call({
        messages: request.messages,
        max_tokens: request.maxTokens ?? 700,
      });
      return content.trim();
    },
  };
}
