import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  temperature?: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () => {
  if (ENV.openAiApiUrl && ENV.openAiApiUrl.trim().length > 0) {
    let url = ENV.openAiApiUrl.replace(/\/$/, "");
    if (!url.endsWith("/chat/completions")) {
      if (url.endsWith("/v1") || url.endsWith("/v1beta")) {
        url += "/chat/completions";
      } else if (url.endsWith("/openai")) {
        url += "/chat/completions";
      } else {
        url += "/v1/chat/completions";
      }
    }
    return url;
  }
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }
  return "https://api.openai.com/v1/chat/completions";
};

const assertApiKey = () => {
  if (ENV.openAiApiKey) return;
  if (ENV.forgeApiKey) return;
  throw new Error("OpenAI or Forge API key is not configured");
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// ── AI 호출 캐시 관리 ──────────────────────────────────────────────
const llmCache = new Map<string, { result: InvokeResult; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2시간 캐시 (API 호출 최소화)

// ── Circuit Breaker: 429/402 발생 엔진을 10분간 차단 ────────────────
const engineBlockedUntil = new Map<string, number>();
const ENGINE_BLOCK_MS = 10 * 60 * 1000; // 10분

function isEngineBlocked(type: string): boolean {
  const blockedUntil = engineBlockedUntil.get(type) ?? 0;
  return Date.now() < blockedUntil;
}

function blockEngine(type: string) {
  engineBlockedUntil.set(type, Date.now() + ENGINE_BLOCK_MS);
  console.warn(
    `[AI Engine] ${type} blocked for 10 minutes due to rate limit / quota error.`
  );
}

function generateCacheKey(params: InvokeParams): string {
  const model =
    params.messages.length > 0 ? JSON.stringify(params.messages.slice(-3)) : "";
  return Buffer.from(model + JSON.stringify(params.responseFormat)).toString(
    "base64"
  );
}

/** 사용 가능한 모든 API 키 수집 및 엔진 태깅 (확장형) */
function getAllApiKeys() {
  const geminiKeys = (ENV.openAiApiKey || "")
    .split(",")
    .map(k => ({ key: k.trim(), type: "gemini" }))
    .filter(o => o.key.length > 0);

  // 기존 수동 등록 키 (환경변수 사용 권장)
  const openAiKey = ENV.openAiApiKey;
  const manusKey = ENV.forgeApiKey;

  // 신규 추천 엔진 키 (환경변수에서 읽어옴)
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const deepseekKey = process.env.DEEPSEEK_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";

  // Manus Forge API: ENV에서 동적으로 읽음 (Manus가 주입한 게이트웨이)
  const forgeKey = ENV.forgeApiKey || manusKey;
  const forgeUrl = ENV.forgeApiUrl || "https://api.manus.im";

  const all = [
    // ✅ Groq 최우선: 무료 30 RPM, 매우 빠름 (llama-3.3-70b)
    { key: groqKey, type: "groq", priority: 1 },
    // ✅ Manus Forge API: 사용자의 Manus 키로 OpenAI 호환 방식 호출
    ...(forgeKey && forgeUrl
      ? [{ key: `${forgeUrl}::${forgeKey}`, type: "forge", priority: 2 }]
      : []),
    // Gemini: 무료 15 RPM
    ...geminiKeys.map(k => ({ ...k, priority: 3 })),
    // OpenAI: 유료 (크레딧 소진 시 차단됨)
    { key: openAiKey, type: "openai", priority: 4 },
    // Anthropic/DeepSeek: 유료 백업
    { key: anthropicKey, type: "anthropic", priority: 5 },
    { key: deepseekKey, type: "deepseek", priority: 5 },
  ].filter(o => o.key.length > 0);

  return all.sort((a, b) => a.priority - b.priority);
}

const keyRotationIndex = 0;

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const cacheKey = generateCacheKey(params);
  const cached = llmCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const keys = getAllApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No AI API keys configured. Please set at least one API key in .env"
    );
  }

  const PER_ENGINE_TIMEOUT_MS = 15_000;
  let lastError: any = null;

  // 엔진을 순서대로 시도 (치단된 엔진 건너뜀)
  for (const { key, type } of keys) {
    // Circuit Breaker: 429/402로 최근 차단된 엔진 건너뜀
    if (isEngineBlocked(type)) {
      console.log(`[AI Engine] Skipping ${type} (circuit breaker active)`);
      continue;
    }

    try {
      let result: InvokeResult;

      const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Engine ${type} timed out after ${PER_ENGINE_TIMEOUT_MS / 1000}s`
                  )
                ),
              PER_ENGINE_TIMEOUT_MS
            )
          ),
        ]);

      switch (type) {
        case "gemini":
          result = await withTimeout(callGemini(params, key));
          break;
        case "openai":
          result = await withTimeout(callOpenAI(params, key, "gpt-4o-mini"));
          break;
        case "anthropic":
          result = await withTimeout(callAnthropic(params, key));
          break;
        case "deepseek":
          result = await withTimeout(callDeepSeek(params, key));
          break;
        case "groq":
          result = await withTimeout(callGroq(params, key));
          break;
        case "forge":
          result = await withTimeout(callForge(params, key));
          break;
        default:
          throw new Error(`Unsupported engine type: ${type}`);
      }

      // 성공: 엔진명을 서버 로그에 표시
      console.log(`[AI Engine] ✅ ${type} responded successfully.`);
      llmCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      if (
        errMsg.includes("429") ||
        errMsg.includes("402") ||
        errMsg.includes("insufficient") ||
        errMsg.includes("quota")
      ) {
        blockEngine(type);
      }
      console.warn(`[AI Engine] ${type} failed:`, errMsg.slice(0, 120));
      lastError = err;
    }
  }

  throw lastError || new Error("All AI engines failed to respond.");
}

/**
 * AI 응답에서 JSON을 안전하게 파싱합니다.
 * llama/Groq 모델이 ```json ... ``` 형태로 응답할 때 자동 처리합니다.
 */
export function parseJsonSafe(raw: string | null | undefined): any {
  if (!raw) throw new Error("Empty AI response");
  // 마크다운 코드블록 제거: ```json ... ``` 또는 ``` ... ```
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}

/** 동시에 여러 AI 엔진의 의견을 수집 (Cross-Check) */
export async function invokeMultiLLM(
  params: InvokeParams,
  engines: string[] = ["gemini", "anthropic", "deepseek"]
): Promise<Record<string, string>> {
  const keys = getAllApiKeys();
  const results: Record<string, string> = {};

  await Promise.all(
    engines.map(async engine => {
      const engineKey = keys.find(k => k.type === engine);
      if (!engineKey) return;

      try {
        let result: InvokeResult;
        switch (engine) {
          case "gemini":
            result = await callGemini(params, engineKey.key);
            break;
          case "anthropic":
            result = await callAnthropic(params, engineKey.key);
            break;
          case "deepseek":
            result = await callDeepSeek(params, engineKey.key);
            break;
          case "openai":
            result = await callOpenAI(params, engineKey.key);
            break;
          case "groq":
            result = await callGroq(params, engineKey.key);
            break;
          default:
            return;
        }
        results[engine] = result.choices[0].message.content;
      } catch (err) {
        results[engine] = `Error: ${(err as Error).message}`;
      }
    })
  );

  return results;
}

async function callAnthropic(
  params: InvokeParams,
  key: string
): Promise<InvokeResult> {
  const url = "https://api.anthropic.com/v1/messages";
  const systemMessage = params.messages.find(m => m.role === "system")?.content;
  const userMessages = params.messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content:
        typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      system: systemMessage,
      messages: userMessages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) throw new Error(`Claude failed: ${response.status}`);
  const data = await response.json();
  return {
    id: data.id,
    created: Date.now(),
    model: data.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: data.content[0].text },
        finish_reason: "stop",
      },
    ],
  } as any;
}

async function callDeepSeek(
  params: InvokeParams,
  key: string
): Promise<InvokeResult> {
  const url = "https://api.deepseek.com/chat/completions";
  return callOpenAiCompatible(url, key, "deepseek-chat", params);
}

async function callGroq(
  params: InvokeParams,
  key: string
): Promise<InvokeResult> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  // Groq json_object 모드 요건: 마지막 user 메시지에 "JSON" 포함 필수
  let groqParams = params;
  if (
    params.responseFormat?.type === "json_object" ||
    params.response_format?.type === "json_object"
  ) {
    const msgs = [...params.messages];
    const lastUserIdx = msgs.map(m => m.role).lastIndexOf("user");
    if (lastUserIdx >= 0) {
      const lastMsg = msgs[lastUserIdx];
      const content =
        typeof lastMsg.content === "string"
          ? lastMsg.content
          : JSON.stringify(lastMsg.content);
      if (!content.toLowerCase().includes("json")) {
        msgs[lastUserIdx] = {
          ...lastMsg,
          content: content + "\n\n반드시 JSON 형식으로만 응답하세요.",
        };
      }
    }
    groqParams = { ...params, messages: msgs };
  }

  return callOpenAiCompatible(url, key, "llama-3.3-70b-versatile", groqParams);
}

async function callOpenAiCompatible(
  url: string,
  key: string,
  model: string,
  params: InvokeParams
): Promise<InvokeResult> {
  const body: any = {
    model,
    messages: params.messages.map(m => {
      const normalized = normalizeMessage(m);
      // 이미지 컨텐츠 변환 (OpenAI 규격: { type: "image_url", image_url: { url: "..." } })
      if (Array.isArray(normalized.content)) {
        normalized.content = normalized.content.map(part => {
          if (part.type === "image_url") {
            return {
              type: "image_url",
              image_url: { url: part.image_url.url },
            };
          }
          return part;
        });
      }
      return normalized;
    }),
  };

  if (params.responseFormat?.type === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${url} failed (${response.status}): ${errText}`);
  }
  return await response.json();
}

/** Manus Forge API 호출 — key 형식: "https://api.manus.im::sk-v..." */
async function callForge(
  params: InvokeParams,
  compositeKey: string
): Promise<InvokeResult> {
  const sep = compositeKey.indexOf("::");
  if (sep === -1)
    throw new Error("Invalid forge key format (expected url::key)");
  const forgeUrl = compositeKey.slice(0, sep);
  const apiKey = compositeKey.slice(sep + 2);

  // Manus Forge는 OpenAI 호환 엔드포인트를 제공
  // /v1/chat/completions 경로를 붙여 호출
  const url = `${forgeUrl.replace(/\/$/, "")}/v1/chat/completions`;

  // 모델명은 환경변수 기준, 없으면 기본값 사용
  const model = ENV.openAiModel || "gemini-2.0-flash";

  try {
    return await callOpenAiCompatible(url, apiKey, model, params);
  } catch (err: any) {
    // Forge URL 실패 시 다른 서브패스도 시도
    if (String(err).includes("404") || String(err).includes("Not Found")) {
      const altUrl = `${forgeUrl.replace(/\/$/, "")}/openai/v1/chat/completions`;
      return await callOpenAiCompatible(altUrl, apiKey, model, params);
    }
    throw err;
  }
}

async function callManus(
  params: InvokeParams,
  key: string
): Promise<InvokeResult> {
  // 레거시 호환 - callForge로 위임
  return callForge(params, `https://api.manus.im::${key}`);
}

async function callOpenAI(
  params: InvokeParams,
  key: string,
  modelName: string = "gpt-4o-mini"
): Promise<InvokeResult> {
  const url = "https://api.openai.com/v1/chat/completions";
  return callOpenAiCompatible(url, key, modelName, params);
}

async function callGemini(
  params: InvokeParams,
  key: string
): Promise<InvokeResult> {
  const model = ENV.openAiModel || "gemini-1.5-flash-latest";
  const modelId = model.startsWith("models/") ? model : `models/${model}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${key}`;

  const systemMessage = params.messages.find(m => m.role === "system");
  const contents = params.messages
    .filter(m => m.role !== "system")
    .map(m => {
      const normalized = normalizeMessage(m);
      const parts: any[] = [];

      if (typeof normalized.content === "string") {
        parts.push({ text: normalized.content });
      } else if (Array.isArray(normalized.content)) {
        normalized.content.forEach(part => {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image_url") {
            // base64 데이터 추출 (data:image/png;base64,...)
            const base64Match = part.image_url.url.match(
              /^data:(image\/[a-z]+);base64,(.+)$/
            );
            if (base64Match) {
              parts.push({
                inline_data: {
                  mime_type: base64Match[1],
                  data: base64Match[2],
                },
              });
            } else {
              // URL인 경우 (Gemini는 URL 이미지를 바로 받기 어려움 - 일단 텍스트로 대체)
              parts.push({ text: `[Image URL: ${part.image_url.url}]` });
            }
          }
        });
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

  const payload: any = { contents };
  if (systemMessage) {
    payload.system_instruction = {
      parts: [
        {
          text:
            typeof systemMessage.content === "string"
              ? systemMessage.content
              : JSON.stringify(systemMessage.content),
        },
      ],
    };
  }

  if (
    params.responseFormat?.type === "json_object" ||
    params.responseFormat?.type === "json_schema"
  ) {
    payload.generationConfig = { response_mime_type: "application/json" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Gemini failed: ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
  } as any;
}
