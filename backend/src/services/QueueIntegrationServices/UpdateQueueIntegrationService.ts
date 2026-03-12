import * as Yup from "yup";

import AppError from "../../errors/AppError";
import QueueIntegrations from "../../models/QueueIntegrations";
import ShowIntegrationService from "./ShowQueueIntegrationService";
import { encryptString } from "../../utils/crypto";

interface IntegrationData {
  type?: string;
  name?: string;
  projectName?: string;
  jsonContent?: string;
  language?: string;
  urlN8N?: string;
  typebotSlug?: string;
  typebotExpires?: number;
  typebotKeywordFinish?: string;
  typebotUnknownMessage?: string;
  typebotDelayMessage?: number;
  typebotKeywordRestart?: string;
  typebotRestartMessage?: string;
}

interface Request {
  integrationData: IntegrationData;
  integrationId: string;
  companyId: number;
}

const UpdateQueueIntegrationService = async ({
  integrationData,
  integrationId,
  companyId
}: Request): Promise<QueueIntegrations> => {
  const schema = Yup.object().shape({
    type: Yup.string().min(2),
    name: Yup.string().min(2)
  });

  const {
    type,
    name,
    projectName,
    jsonContent,
    language,
    urlN8N,
    typebotExpires,
    typebotKeywordFinish,
    typebotSlug,
    typebotUnknownMessage,
    typebotDelayMessage,
    typebotKeywordRestart,
    typebotRestartMessage 
  } = integrationData;

  try {
    await schema.validate({ type, name, projectName, jsonContent, language, urlN8N });
  } catch (err) {
    throw new AppError(err.message);
  }

  const integration = await ShowIntegrationService(integrationId, companyId);

  // Prepare jsonContent for persistence
  let jsonToPersist: string | undefined = jsonContent;
  if ((type || integration.type) === "openai") {
    try {
      const incoming = jsonContent ? JSON.parse(jsonContent) : {};
      const current = integration.jsonContent ? JSON.parse(integration.jsonContent) : {};

      // Preserve existing apiKey if incoming is missing or masked
      const incomingKey = incoming?.apiKey;
      if (typeof incomingKey === "string" && incomingKey.length > 0 && incomingKey !== "********") {
        if (!incomingKey.startsWith("ENC::")) {
          incoming.apiKey = encryptString(incomingKey);
        }
      } else {
        incoming.apiKey = current?.apiKey; // keep existing (already encrypted)
      }

      // Merge model and any other fields
      const merged = { ...current, ...incoming };
      jsonToPersist = JSON.stringify(merged);
    } catch (_) {
      // if parse fails, fallback to incoming string as-is
    }
  }

  await integration.update({
    type,
    name,
    projectName,
    jsonContent: jsonToPersist,
    language,
    urlN8N,
    companyId,
    typebotExpires,
    typebotKeywordFinish,
    typebotSlug,
    typebotUnknownMessage,
    typebotDelayMessage,
    typebotKeywordRestart,
    typebotRestartMessage 
  });

  return integration;
};

export default UpdateQueueIntegrationService;