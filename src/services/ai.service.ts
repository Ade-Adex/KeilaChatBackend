// /src/services/ai.service.ts


export class AIService {
  static async generateReply(message: string, context: any[]) {
    // placeholder for OpenAI / Gemini / Claude
    return {
      reply: `AI Response: ${message}`,
      confidence: 0.8,
      shouldEscalate: false,
    }
  }

  static shouldEscalate(confidence: number) {
    return confidence < 0.6
  }
}
