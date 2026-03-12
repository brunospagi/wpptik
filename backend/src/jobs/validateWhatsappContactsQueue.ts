import logger from "../utils/logger";
import ContactListItem from "../models/ContactListItem";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import { Op } from "sequelize";

interface ValidateWhatsappContactsData {
  contactListId: number;
  companyId: number;
  batchSize?: number;
}

export default {
  key: `${process.env.DB_NAME}-validateWhatsappContacts`,

  async handle({ data }: { data: ValidateWhatsappContactsData }) {
    try {
      const { contactListId, companyId, batchSize = 50 } = data;
      
      logger.info(`[ValidateWhatsappContacts] *** JOB INICIADO *** para lista ${contactListId}, empresa ${companyId}, batchSize ${batchSize}`);

      // Buscar contatos não validados em lotes
      const contacts = await ContactListItem.findAll({
        where: {
          contactListId,
          companyId,
          isWhatsappValid: null
        },
        limit: batchSize,
        order: [['id', 'ASC']]
      });

      if (contacts.length === 0) {
        logger.info(`[ValidateWhatsappContacts] Nenhum contato pendente de validação encontrado para lista ${contactListId}`);
        return;
      }

      logger.info(`[ValidateWhatsappContacts] Validando ${contacts.length} contatos da lista ${contactListId}`);

      let validCount = 0;
      let invalidCount = 0;
      let errorCount = 0;

      // Processar cada contato
      for (const contact of contacts) {
        try {
          const validatedNumber = await CheckContactNumber(contact.number, companyId);
          
          if (validatedNumber) {
            await contact.update({
              number: validatedNumber,
              isWhatsappValid: true,
              validatedAt: new Date()
            });
            validCount++;
          } else {
            await contact.update({
              isWhatsappValid: false,
              validatedAt: new Date()
            });
            invalidCount++;
          }
        } catch (error: any) {
          const msg = error?.message || "";
          if (
            msg === "invalidNumber" ||
            msg === "ERR_WAPP_INVALID_CONTACT" ||
            /não está cadastrado/i.test(msg)
          ) {
            await contact.update({
              isWhatsappValid: false,
              validatedAt: new Date()
            });
            invalidCount++;
          } else {
            logger.warn(`[ValidateWhatsappContacts] Erro ao validar contato ${contact.id}:`, {
              number: contact.number,
              error: msg
            });
            errorCount++;
          }
        }

        // Pequeno delay entre validações para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`[ValidateWhatsappContacts] Lote processado - Lista: ${contactListId}, Válidos: ${validCount}, Inválidos: ${invalidCount}, Erros: ${errorCount}`);

      // Se ainda há contatos para validar, reagendar próximo lote
      const remainingCount = await ContactListItem.count({
        where: {
          contactListId,
          companyId,
          isWhatsappValid: null
        }
      });

      if (remainingCount > 0) {
        logger.info(`[ValidateWhatsappContacts] Reagendando próximo lote - ${remainingCount} contatos restantes`);
        
        // Reagendar próximo lote usando import dinâmico para evitar dependência circular
        try {
          const queues = await import("../queues");
          await queues.validateWhatsappContactsQueue.add(
            "validateWhatsappContacts",
            { contactListId, companyId, batchSize },
            { 
              delay: 5000, // 5 segundos entre lotes
              removeOnComplete: 10,
              removeOnFail: 5
            }
          );
        } catch (importError: any) {
          logger.error(`[ValidateWhatsappContacts] Erro ao reagendar:`, { error: importError.message });
        }
      } else {
        logger.info(`[ValidateWhatsappContacts] Validação completa para lista ${contactListId}`);
      }

    } catch (error: any) {
      logger.error(`[ValidateWhatsappContacts] Erro no job:`, {
        message: error.message,
        stack: error.stack,
        data
      });
      throw error;
    }
  }
};
