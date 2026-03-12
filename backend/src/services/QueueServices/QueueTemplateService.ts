import Queue from "../../models/Queue";
import Files from "../../models/Files";
import FilesOptions from "../../models/FilesOptions";

interface QueueTemplate {
  name: string;
  color: string;
  orderQueue: number;
  autoSendStrategy: "none" | "on_enter" | "on_request" | "manual";
  confirmationTemplate: string;
  maxFilesPerSession: number;
  ragCollection: string;
  description: string;
  useCase: string;
}

class QueueTemplateService {
  
  /**
   * Templates predefinidos para diferentes tipos de negócio
   */
  static getTemplates(): QueueTemplate[] {
    return [
      {
        name: "Vendas - Catálogo Automático",
        color: "#2196F3",
        orderQueue: 1,
        autoSendStrategy: "on_enter",
        confirmationTemplate: "Olá {{name}}! 👋 Bem-vindo à nossa loja!\n\nGostaria de receber nosso catálogo de produtos atualizado?\n\nDigite:\n*1* - SIM, quero o catálogo\n*2* - NÃO, obrigado",
        maxFilesPerSession: 3,
        ragCollection: "vendas_catalogos",
        description: "Fila para vendas com envio automático de catálogo ao entrar",
        useCase: "E-commerce, Lojas, Varejo"
      },
      {
        name: "Suporte - Sob Demanda",
        color: "#FF9800",
        orderQueue: 2,
        autoSendStrategy: "on_request",
        confirmationTemplate: "Encontrei materiais que podem ajudar com sua dúvida! 🔍\n\nGostaria que eu envie?\n\n*1* - SIM, envie os materiais\n*2* - NÃO, prefiro falar com atendente",
        maxFilesPerSession: 2,
        ragCollection: "suporte_manuais",
        description: "Fila de suporte que analisa mensagens e sugere arquivos relevantes",
        useCase: "Suporte Técnico, Help Desk, FAQ"
      },
      {
        name: "Financeiro - Manual",
        color: "#4CAF50",
        orderQueue: 3,
        autoSendStrategy: "manual",
        confirmationTemplate: "Vou enviar os documentos solicitados. 📄\n\nPor favor, aguarde um momento...",
        maxFilesPerSession: 5,
        ragCollection: "financeiro_documentos",
        description: "Fila financeira onde apenas agentes decidem quando enviar arquivos",
        useCase: "Financeiro, Contratos, Documentação"
      },
      {
        name: "RH - Políticas",
        color: "#9C27B0",
        orderQueue: 4,
        autoSendStrategy: "on_request",
        confirmationTemplate: "Olá {{name}}! 👥\n\nEncontrei informações sobre políticas da empresa.\n\nDeseja receber?\n\n*1* - SIM\n*2* - NÃO",
        maxFilesPerSession: 4,
        ragCollection: "rh_politicas",
        description: "Fila de RH para envio de políticas e procedimentos",
        useCase: "Recursos Humanos, Onboarding, Políticas"
      },
      {
        name: "Marketing - Proativo",
        color: "#E91E63",
        orderQueue: 5,
        autoSendStrategy: "on_enter",
        confirmationTemplate: "🎯 Novidades exclusivas para você!\n\nTemos materiais promocionais incríveis!\n\nQuer receber?\n\n*1* - SIM, quero as novidades!\n*2* - Talvez depois",
        maxFilesPerSession: 3,
        ragCollection: "marketing_promocoes",
        description: "Fila de marketing com envio proativo de materiais promocionais",
        useCase: "Marketing, Promoções, Campanhas"
      }
    ];
  }

  /**
   * Cria filas baseadas em templates
   */
  static async createQueuesFromTemplates(
    companyId: number, 
    selectedTemplates: string[]
  ): Promise<Queue[]> {
    const templates = this.getTemplates();
    const createdQueues: Queue[] = [];

    for (const templateName of selectedTemplates) {
      const template = templates.find(t => t.name === templateName);
      if (!template) continue;

      try {
        const queue = await Queue.create({
          name: template.name,
          color: template.color,
          orderQueue: template.orderQueue,
          autoSendStrategy: template.autoSendStrategy,
          confirmationTemplate: template.confirmationTemplate,
          maxFilesPerSession: template.maxFilesPerSession,
          ragCollection: template.ragCollection,
          companyId,
          greetingMessage: `Bem-vindo à fila ${template.name}!`
        });

        createdQueues.push(queue);
      } catch (error) {
        console.error(`Erro ao criar fila ${template.name}:`, error);
      }
    }

    return createdQueues;
  }

  /**
   * Cria listas de arquivos de exemplo para cada tipo
   */
  static async createSampleFileLists(companyId: number): Promise<Files[]> {
    const fileLists = [
      {
        name: "Catálogo de Produtos",
        message: "Nossos produtos incríveis!",
        isActive: true,
        tags: { categoria: "vendas", tipo: "catalogo" },
        fileSlug: "catalogo-produtos",
        sampleFiles: [
          {
            name: "Catálogo Verão 2024",
            keywords: "catálogo, produtos, verão, roupas, moda",
            description: "Catálogo completo da coleção verão 2024 com todos os produtos disponíveis"
          },
          {
            name: "Tabela de Preços",
            keywords: "preços, valores, tabela, custo",
            description: "Tabela atualizada com preços de todos os produtos"
          }
        ]
      },
      {
        name: "Manuais Técnicos",
        message: "Documentação técnica",
        isActive: true,
        tags: { categoria: "suporte", tipo: "manual" },
        fileSlug: "manuais-tecnicos",
        sampleFiles: [
          {
            name: "Manual de Instalação",
            keywords: "instalação, instalar, setup, configurar",
            description: "Guia passo-a-passo para instalação do sistema"
          },
          {
            name: "FAQ - Perguntas Frequentes",
            keywords: "faq, dúvidas, perguntas, problemas, ajuda",
            description: "Respostas para as perguntas mais frequentes"
          }
        ]
      },
      {
        name: "Documentos Financeiros",
        message: "Documentação financeira",
        isActive: true,
        tags: { categoria: "financeiro", tipo: "documento" },
        fileSlug: "docs-financeiros",
        sampleFiles: [
          {
            name: "Contrato de Serviços",
            keywords: "contrato, serviços, acordo, termos",
            description: "Modelo de contrato de prestação de serviços"
          },
          {
            name: "Formulário de Crédito",
            keywords: "crédito, financiamento, formulário, solicitação",
            description: "Formulário para solicitação de crédito"
          }
        ]
      }
    ];

    const createdLists: Files[] = [];

    for (const listData of fileLists) {
      try {
        const fileList = await Files.create({
          name: listData.name,
          message: listData.message,
          isActive: listData.isActive,
          tags: listData.tags,
          fileSlug: listData.fileSlug,
          companyId
        });

        // Criar arquivos de exemplo (sem upload real)
        for (const fileData of listData.sampleFiles) {
          await FilesOptions.create({
            name: fileData.name,
            path: `samples/${fileData.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
            keywords: fileData.keywords,
            description: fileData.description,
            isActive: true,
            fileId: fileList.id
          });
        }

        createdLists.push(fileList);
      } catch (error) {
        console.error(`Erro ao criar lista ${listData.name}:`, error);
      }
    }

    return createdLists;
  }

  /**
   * Configuração completa para um novo cliente
   */
  static async setupCompleteEnvironment(companyId: number): Promise<{
    queues: Queue[];
    fileLists: Files[];
    summary: string;
  }> {
    // Criar todas as filas
    const allTemplates = this.getTemplates().map(t => t.name);
    const queues = await this.createQueuesFromTemplates(companyId, allTemplates);

    // Criar listas de arquivos
    const fileLists = await this.createSampleFileLists(companyId);

    // Associar filas às listas apropriadas
    if (queues.length > 0 && fileLists.length > 0) {
      // Vendas -> Catálogo
      const vendas = queues.find(q => q.name.includes("Vendas"));
      const catalogo = fileLists.find(f => f.name.includes("Catálogo"));
      if (vendas && catalogo) {
        await vendas.update({ fileListId: catalogo.id });
      }

      // Suporte -> Manuais
      const suporte = queues.find(q => q.name.includes("Suporte"));
      const manuais = fileLists.find(f => f.name.includes("Manuais"));
      if (suporte && manuais) {
        await suporte.update({ fileListId: manuais.id });
      }

      // Financeiro -> Documentos
      const financeiro = queues.find(q => q.name.includes("Financeiro"));
      const documentos = fileLists.find(f => f.name.includes("Documentos"));
      if (financeiro && documentos) {
        await financeiro.update({ fileListId: documentos.id });
      }
    }

    const summary = `
🎉 Ambiente configurado com sucesso!

📋 FILAS CRIADAS (${queues.length}):
${queues.map(q => `• ${q.name} (${q.autoSendStrategy})`).join('\n')}

📁 LISTAS DE ARQUIVOS (${fileLists.length}):
${fileLists.map(f => `• ${f.name}`).join('\n')}

🔗 ASSOCIAÇÕES:
• Vendas ↔ Catálogo de Produtos
• Suporte ↔ Manuais Técnicos  
• Financeiro ↔ Documentos Financeiros

✅ Pronto para usar!
    `;

    return { queues, fileLists, summary };
  }
}

export default QueueTemplateService;
