import { Op } from "sequelize";
import FilesOptions from "../../models/FilesOptions";
import Files from "../../models/Files";
import CompaniesSettings from "../../models/CompaniesSettings";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import logger from "../../utils/logger";
import OpenAI from "openai";

interface AISearchRequest {
  query: string;
  ticket: Ticket;
  queue: Queue;
  maxResults?: number;
  useAdvancedAI?: boolean;
}

interface AISearchResult {
  hasResults: boolean;
  suggestedFiles: FilesOptions[];
  aiResponse: string;
  confidence: number;
  analysis: {
    intent: string;
    entities: string[];
    sentiment: string;
    contextualResponse: string;
  };
}

interface AIAnalysis {
  intent: "question" | "request" | "complaint" | "praise" | "purchase" | "support" | "other";
  confidence: number;
  entities: string[];
  sentiment: "positive" | "negative" | "neutral";
  suggestedFileTypes: string[];
  contextualResponse: string;
}

class QueueAIService {

  /**
   * Busca arquivos usando IA avançada
   */
  static async searchWithAI({
    query,
    ticket,
    queue,
    maxResults = 3,
    useAdvancedAI = true
  }: AISearchRequest): Promise<AISearchResult> {
    
    const result: AISearchResult = {
      hasResults: false,
      suggestedFiles: [],
      aiResponse: "",
      confidence: 0,
      analysis: {
        intent: "other",
        entities: [],
        sentiment: "neutral",
        contextualResponse: ""
      }
    };

    try {
      // Análise com IA se disponível
      let aiAnalysis: AIAnalysis | null = null;
      if (useAdvancedAI) {
        aiAnalysis = await this.analyzeWithOpenAI(query, ticket.companyId);
      }

      // Fallback para análise simples
      if (!aiAnalysis) {
        aiAnalysis = this.analyzeWithPatterns(query);
      }

      // Buscar arquivos relevantes
      const relevantFiles = await this.findRelevantFiles(
        query, 
        queue.fileListId, 
        ticket.companyId,
        aiAnalysis
      );

      // Construir resultado
      result.suggestedFiles = relevantFiles.slice(0, maxResults);
      result.hasResults = result.suggestedFiles.length > 0;
      result.confidence = aiAnalysis.confidence;
      result.analysis = {
        intent: aiAnalysis.intent,
        entities: aiAnalysis.entities,
        sentiment: aiAnalysis.sentiment,
        contextualResponse: aiAnalysis.contextualResponse
      };

      // Gerar resposta contextual
      result.aiResponse = this.generateContextualResponse(
        query,
        result.suggestedFiles,
        aiAnalysis
      );

      logger.info({
        ticketId: ticket.id,
        queueId: queue.id,
        query,
        filesFound: result.suggestedFiles.length,
        intent: aiAnalysis.intent,
        confidence: result.confidence
      }, "AI search completed");

      return result;

    } catch (error) {
      logger.error({
        error,
        ticketId: ticket.id,
        queueId: queue.id,
        query
      }, "Error in AI search");
      
      return result;
    }
  }

  /**
   * Análise avançada com OpenAI
   */
  private static async analyzeWithOpenAI(query: string, companyId: number): Promise<AIAnalysis | null> {
    try {
      const settings = await CompaniesSettings.findOne({
        where: { companyId }
      });

      if (!settings?.openaiApiKey) {
        logger.debug({ companyId }, "OpenAI not configured, using fallback");
        return null;
      }

      const openai = new OpenAI({
        apiKey: settings.openaiApiKey
      });

      const systemPrompt = `Você é um assistente especializado em análise de intenção de clientes para sistemas de atendimento.
Analise a mensagem do cliente e retorne um JSON estruturado com:
- intent: tipo de intenção (question, request, complaint, praise, purchase, support, other)
- confidence: nível de confiança (0.0 a 1.0)
- entities: entidades importantes identificadas
- sentiment: sentimento (positive, negative, neutral)
- suggestedFileTypes: tipos de arquivos que seriam úteis
- contextualResponse: resposta contextual sugerida

Seja preciso e contextual. Responda APENAS com JSON válido.`;

      const userPrompt = `Analise esta mensagem de cliente:
"${query}"

Contexto: Sistema de atendimento com envio automático de arquivos (catálogos, manuais, documentos).`;

      const response = await openai.chat.completions.create({
        model: settings.openaiModel || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const analysis = JSON.parse(content);
      
      logger.info({
        query,
        companyId,
        analysis
      }, "OpenAI analysis completed");

      return analysis;

    } catch (error) {
      logger.error({
        error,
        query,
        companyId
      }, "Error in OpenAI analysis");
      return null;
    }
  }

  /**
   * Análise com padrões (fallback)
   */
  private static analyzeWithPatterns(query: string): AIAnalysis {
    const queryLower = query.toLowerCase();
    
    // Detectar intenção
    let intent: AIAnalysis["intent"] = "other";
    let confidence = 0.3;

    const intentPatterns = {
      question: [/como/i, /quando/i, /onde/i, /por que/i, /qual/i, /\?/, /dúvida/i],
      request: [/preciso/i, /quero/i, /gostaria/i, /pode enviar/i, /me manda/i, /solicito/i],
      complaint: [/problema/i, /erro/i, /não funciona/i, /reclamação/i, /insatisfeito/i],
      praise: [/obrigado/i, /parabéns/i, /excelente/i, /muito bom/i, /satisfeito/i],
      purchase: [/comprar/i, /preço/i, /valor/i, /catálogo/i, /produto/i, /venda/i],
      support: [/ajuda/i, /suporte/i, /manual/i, /tutorial/i, /instrução/i]
    };

    for (const [intentType, patterns] of Object.entries(intentPatterns)) {
      const matches = patterns.filter(pattern => pattern.test(queryLower));
      if (matches.length > 0) {
        intent = intentType as AIAnalysis["intent"];
        confidence = Math.min(0.7, matches.length * 0.2);
        break;
      }
    }

    // Extrair entidades simples
    const entities = [];
    const words = queryLower.split(/\s+/);
    const importantWords = words.filter(word => 
      word.length > 3 && 
      !['como', 'quando', 'onde', 'para', 'com', 'sem', 'por', 'que', 'uma', 'um'].includes(word)
    );
    entities.push(...importantWords.slice(0, 3));

    // Detectar sentimento
    let sentiment: AIAnalysis["sentiment"] = "neutral";
    const positiveWords = ['bom', 'ótimo', 'excelente', 'obrigado', 'parabéns'];
    const negativeWords = ['ruim', 'problema', 'erro', 'insatisfeito', 'reclamação'];
    
    if (positiveWords.some(word => queryLower.includes(word))) {
      sentiment = "positive";
    } else if (negativeWords.some(word => queryLower.includes(word))) {
      sentiment = "negative";
    }

    // Sugerir tipos de arquivo
    const suggestedFileTypes = [];
    if (intent === "question" || intent === "support") {
      suggestedFileTypes.push("manual", "faq", "tutorial");
    } else if (intent === "purchase") {
      suggestedFileTypes.push("catálogo", "preços", "produtos");
    } else if (intent === "complaint") {
      suggestedFileTypes.push("suporte", "contato", "garantia");
    }

    return {
      intent,
      confidence,
      entities,
      sentiment,
      suggestedFileTypes,
      contextualResponse: this.generateFallbackResponse(intent, entities)
    };
  }

  /**
   * Busca arquivos relevantes baseado na análise
   */
  private static async findRelevantFiles(
    query: string,
    fileListId: number,
    companyId: number,
    analysis: AIAnalysis
  ): Promise<FilesOptions[]> {
    
    if (!fileListId) return [];

    const files = await FilesOptions.findAll({
      include: [
        {
          model: Files,
          as: "file",
          where: {
            id: fileListId,
            companyId,
            isActive: true
          }
        }
      ],
      where: {
        isActive: true
      }
    });

    const scoredFiles = files.map(file => ({
      file,
      score: this.calculateRelevanceScore(file, query, analysis)
    }));

    return scoredFiles
      .filter(item => item.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .map(item => item.file);
  }

  /**
   * Calcula score de relevância com IA
   */
  private static calculateRelevanceScore(
    file: FilesOptions,
    query: string,
    analysis: AIAnalysis
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const fileName = file.name.toLowerCase();
    const keywords = file.keywords?.toLowerCase() || "";
    const description = file.description?.toLowerCase() || "";

    // Score baseado em correspondência direta
    if (queryLower.includes(fileName) || fileName.includes(queryLower)) {
      score += 0.8;
    }

    // Score baseado em palavras-chave
    for (const entity of analysis.entities) {
      if (keywords.includes(entity) || description.includes(entity) || fileName.includes(entity)) {
        score += 0.3;
      }
    }

    // Score baseado em tipos sugeridos
    for (const fileType of analysis.suggestedFileTypes) {
      if (keywords.includes(fileType) || description.includes(fileType) || fileName.includes(fileType)) {
        score += 0.4;
      }
    }

    // Boost baseado na intenção
    const intentBoosts = {
      question: keywords.includes("manual") || keywords.includes("faq") ? 0.3 : 0,
      request: 0.2,
      complaint: keywords.includes("suporte") ? 0.4 : 0,
      purchase: keywords.includes("catálogo") || keywords.includes("produto") ? 0.4 : 0,
      support: keywords.includes("suporte") || keywords.includes("manual") ? 0.4 : 0,
      praise: 0.1,
      other: 0.1
    };

    score += intentBoosts[analysis.intent] || 0;
    score *= analysis.confidence;

    return Math.min(score, 1.0);
  }

  /**
   * Gera resposta contextual
   */
  private static generateContextualResponse(
    query: string,
    files: FilesOptions[],
    analysis: AIAnalysis
  ): string {
    if (files.length === 0) {
      const noResultsResponses = {
        question: "🤔 Não encontrei arquivos específicos para sua pergunta, mas posso conectá-lo com um atendente para ajudar melhor.",
        request: "📋 Não tenho exatamente o que você solicitou no momento. Vou transferir para um especialista.",
        complaint: "😔 Entendo sua preocupação. Vou conectá-lo imediatamente com nosso suporte para resolver isso.",
        purchase: "🛒 Vou buscar informações atualizadas sobre nossos produtos. Um consultor entrará em contato.",
        support: "🔧 Para esse tipo de suporte, é melhor falar diretamente com nossa equipe técnica.",
        praise: "😊 Muito obrigado pelo feedback! Há algo mais em que posso ajudar?",
        other: "🤝 Vou conectá-lo com um atendente para ajudar com sua solicitação."
      };

      return noResultsResponses[analysis.intent] || noResultsResponses.other;
    }

    const fileNames = files.map(f => f.name).join(", ");
    
    const successResponses = {
      question: `🎯 Encontrei materiais que podem responder sua dúvida: ${fileNames}. Gostaria que eu envie?`,
      request: `✅ Tenho exatamente o que você precisa: ${fileNames}. Posso enviar agora?`,
      complaint: `🆘 Para resolver seu problema, tenho estes recursos: ${fileNames}. Vou enviar para ajudar?`,
      purchase: `🛍️ Perfeito! Tenho informações sobre nossos produtos: ${fileNames}. Quer receber?`,
      support: `🔧 Para te ajudar, encontrei: ${fileNames}. Estes materiais podem ser úteis?`,
      praise: `😊 Que bom que está satisfeito! Tenho mais materiais interessantes: ${fileNames}. Quer ver?`,
      other: `📁 Encontrei alguns arquivos relevantes: ${fileNames}. Gostaria de receber?`
    };

    return successResponses[analysis.intent] || successResponses.other;
  }

  /**
   * Resposta de fallback
   */
  private static generateFallbackResponse(intent: string, entities: string[]): string {
    const entityText = entities.length > 0 ? ` sobre ${entities.join(", ")}` : "";
    
    const responses = {
      question: `Vou buscar informações${entityText} para responder sua pergunta.`,
      request: `Entendi que você precisa${entityText}. Vou verificar o que temos disponível.`,
      complaint: `Compreendo sua preocupação${entityText}. Vamos resolver isso juntos.`,
      purchase: `Interessado em nossos produtos${entityText}? Vou buscar as informações.`,
      support: `Precisa de ajuda${entityText}? Vou encontrar os recursos necessários.`,
      praise: `Obrigado pelo feedback positivo${entityText}!`,
      other: `Vou ajudar você${entityText} da melhor forma possível.`
    };

    return responses[intent as keyof typeof responses] || responses.other;
  }

  /**
   * Análise de sentimento avançada
   */
  static async analyzeSentiment(message: string, companyId: number): Promise<{
    sentiment: "positive" | "negative" | "neutral";
    confidence: number;
    emotions: string[];
  }> {
    // Implementação simples - pode ser expandida com IA
    const messageLower = message.toLowerCase();
    
    const positiveWords = ['bom', 'ótimo', 'excelente', 'obrigado', 'parabéns', 'satisfeito', 'feliz'];
    const negativeWords = ['ruim', 'problema', 'erro', 'insatisfeito', 'reclamação', 'triste', 'irritado'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (messageLower.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (messageLower.includes(word)) negativeCount++;
    });
    
    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    let confidence = 0.5;
    
    if (positiveCount > negativeCount) {
      sentiment = "positive";
      confidence = Math.min(0.9, 0.5 + (positiveCount * 0.2));
    } else if (negativeCount > positiveCount) {
      sentiment = "negative";
      confidence = Math.min(0.9, 0.5 + (negativeCount * 0.2));
    }
    
    const emotions = [];
    if (messageLower.includes('feliz') || messageLower.includes('alegre')) emotions.push('alegria');
    if (messageLower.includes('triste')) emotions.push('tristeza');
    if (messageLower.includes('irritado') || messageLower.includes('bravo')) emotions.push('raiva');
    if (messageLower.includes('preocupado')) emotions.push('preocupação');
    
    return { sentiment, confidence, emotions };
  }
}

export default QueueAIService;
