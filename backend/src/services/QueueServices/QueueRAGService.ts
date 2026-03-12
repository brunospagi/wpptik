import { Op } from "sequelize";
import Queue from "../../models/Queue";
import Files from "../../models/Files";
import FilesOptions from "../../models/FilesOptions";
import Ticket from "../../models/Ticket";
import logger from "../../utils/logger";
import axios from "axios";

interface RAGSearchRequest {
  query: string;
  ticket: Ticket;
  queue: Queue;
  topK?: number;
}

interface RAGSearchResult {
  hasResults: boolean;
  suggestedFiles: FilesOptions[];
  aiResponse: string;
  confidence: number;
}

interface FileRecommendation {
  file: FilesOptions;
  relevanceScore: number;
  reason: string;
}

class QueueRAGService {

  /**
   * Busca arquivos relevantes usando palavras-chave simples
   */
  static async searchRelevantFiles({
    query,
    ticket,
    queue,
    topK = 3
  }: RAGSearchRequest): Promise<RAGSearchResult> {
    
    const result: RAGSearchResult = {
      hasResults: false,
      suggestedFiles: [],
      aiResponse: "",
      confidence: 0
    };

    try {
      // Por enquanto, usar lógica simples baseada em palavras-chave
      const fileRecommendations = await this.extractFileRecommendations(
        query,
        queue.fileListId,
        ticket.companyId
      );

      result.suggestedFiles = fileRecommendations.map(rec => rec.file).slice(0, topK);
      result.hasResults = result.suggestedFiles.length > 0;
      result.aiResponse = this.buildSimpleResponse(query, fileRecommendations);
      result.confidence = fileRecommendations.length > 0 ? 0.7 : 0.1;

      return result;

    } catch (error) {
      logger.error({
        error,
        queueId: queue.id,
        ticketId: ticket.id,
        query
      }, "Error searching relevant files");
      
      return result;
    }
  }

  /**
   * Indexa arquivos da fila na coleção RAG (placeholder para futuro)
   */
  static async indexQueueFiles(queueId: number, companyId: number): Promise<void> {
    logger.info({
      queueId,
      companyId
    }, "RAG indexing not implemented yet - placeholder method");
  }

  /**
   * Constrói resposta simples baseada em recomendações
   */
  private static buildSimpleResponse(query: string, recommendations: FileRecommendation[]): string {
    if (recommendations.length === 0) {
      return "Não encontrei arquivos específicos para sua solicitação, mas posso ajudá-lo de outras formas.";
    }

    const fileNames = recommendations.map(rec => rec.file.name).join(', ');
    return `Encontrei alguns arquivos que podem ajudar: ${fileNames}. Gostaria que eu envie algum deles?`;
  }

  /**
   * Extrai recomendações de arquivos baseado em palavras-chave
   */
  private static async extractFileRecommendations(
    query: string,
    fileListId: number,
    companyId: number
  ): Promise<FileRecommendation[]> {
    
    if (!fileListId) return [];

    // Buscar arquivos disponíveis
    const availableFiles = await FilesOptions.findAll({
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

    // Analisar query para identificar arquivos relevantes
    const recommendations: FileRecommendation[] = [];
    const queryLower = query.toLowerCase();
    
    for (const file of availableFiles) {
      let relevanceScore = 0;
      let reason = "";

      // Verificar se o nome do arquivo é mencionado
      const fileName = file.name.toLowerCase();
      if (queryLower.includes(fileName)) {
        relevanceScore += 0.8;
        reason = "Nome do arquivo mencionado";
      }

      // Verificar palavras-chave
      if (file.keywords) {
        const keywords = file.keywords.toLowerCase().split(',');
        const matchedKeywords = keywords.filter(keyword => 
          queryLower.includes(keyword.trim())
        );
        
        if (matchedKeywords.length > 0) {
          relevanceScore += 0.6 * (matchedKeywords.length / keywords.length);
          reason = reason || `Palavras-chave: ${matchedKeywords.join(', ')}`;
        }
      }

      // Verificar descrição
      if (file.description) {
        const descWords = file.description.toLowerCase().split(' ');
        const matchedDesc = descWords.filter(word => 
          word.length > 3 && queryLower.includes(word)
        );
        
        if (matchedDesc.length > 0) {
          relevanceScore += 0.3 * (matchedDesc.length / descWords.length);
          reason = reason || "Descrição relevante";
        }
      }

      if (relevanceScore > 0.2) {
        recommendations.push({
          file,
          relevanceScore,
          reason
        });
      }
    }

    // Ordenar por relevância
    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export default QueueRAGService;
