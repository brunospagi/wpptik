import { Op } from "sequelize";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import { safeNormalizePhoneNumber } from "../../utils/phone";

interface Request {
  companyId: number;
  dryRun?: boolean; // Se true, apenas simula sem alterar dados
}

interface Response {
  processed: number;
  normalized: number;
  errors: number;
  details: Array<{
    id: number;
    name: string;
    originalNumber: string;
    normalizedNumber: string;
    action: 'normalized' | 'kept' | 'error';
  }>;
}

const NormalizeContactNumbersService = async ({
  companyId,
  dryRun = false
}: Request): Promise<Response> => {
  try {
    logger.info(`Iniciando normalização de números de contatos - Empresa: ${companyId}, DryRun: ${dryRun}`);
    
    // Buscar todos os contatos da empresa
    const contacts = await Contact.findAll({
      where: { 
        companyId,
        number: { [Op.ne]: null } // Apenas contatos com número
      },
      attributes: ['id', 'name', 'number'],
      order: [['id', 'ASC']]
    });
    
    logger.info(`Encontrados ${contacts.length} contatos para processar`);
    
    let processed = 0;
    let normalized = 0;
    let errors = 0;
    const details: Response['details'] = [];
    
    for (const contact of contacts) {
      try {
        processed++;
        
        const { canonical: canonicalNumber } = safeNormalizePhoneNumber(contact.number);
        const newNumber = canonicalNumber;
        const shouldUpdate = Boolean(newNumber && newNumber !== contact.number);
        
        if (shouldUpdate && newNumber) {
          if (!dryRun) {
            // Atualizar o contato
            await contact.update({ number: newNumber });
          }
          
          normalized++;
          details.push({
            id: contact.id,
            name: contact.name,
            originalNumber: contact.number,
            normalizedNumber: newNumber,
            action: 'normalized'
          });
          
          logger.debug(`Contato ${contact.id} normalizado: ${contact.number} → ${newNumber}`);
        } else {
          details.push({
            id: contact.id,
            name: contact.name,
            originalNumber: contact.number,
            normalizedNumber: contact.number,
            action: 'kept'
          });
        }
        
      } catch (error: any) {
        errors++;
        details.push({
          id: contact.id,
          name: contact.name,
          originalNumber: contact.number,
          normalizedNumber: contact.number,
          action: 'error'
        });
        
        logger.error(`Erro ao normalizar contato ${contact.id}:`, {
          message: error.message,
          contactId: contact.id,
          originalNumber: contact.number
        });
      }
    }
    
    const result = {
      processed,
      normalized,
      errors,
      details
    };
    
    logger.info(`Normalização concluída - Processados: ${processed}, Normalizados: ${normalized}, Erros: ${errors}`);
    
    if (dryRun) {
      logger.info("Modo DryRun ativo - nenhuma alteração foi salva no banco");
    }
    
    return result;
    
  } catch (error: any) {
    logger.error('Erro no serviço de normalização de números:', {
      message: error.message,
      stack: error.stack,
      companyId,
      dryRun
    });
    throw error;
  }
};

export default NormalizeContactNumbersService;
