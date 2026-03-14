import axios, { AxiosInstance } from "axios";
import {
  IWhatsAppAdapter,
  IWhatsAppMessage,
  ISendMessageOptions,
  IProfileInfo,
  ConnectionStatus,
  WhatsAppAdapterError
} from "./IWhatsAppAdapter";

import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";

export class EvolutionAPIAdapter implements IWhatsAppAdapter {

  public readonly whatsappId: number;
  public readonly channelType: "evolution" = "evolution";

  private api: AxiosInstance;
  private whatsapp: Whatsapp;

  private status: ConnectionStatus = "disconnected";
  private phoneNumber: string | null = null;

  private messageCallbacks: Array<(message: IWhatsAppMessage) => void> = [];
  private connectionCallbacks: Array<(status: ConnectionStatus) => void> = [];
  private qrCallbacks: Array<(qr: string) => void> = [];

  constructor(whatsapp: Whatsapp) {
    this.whatsapp = whatsapp;
    this.whatsappId = whatsapp.id;

    // Configuração base do Axios para a Evolution API
    this.api = axios.create({
      baseURL: whatsapp.evolutionApiUrl,
      timeout: 15000,
      headers: {
        apikey: whatsapp.evolutionApiKey // Global API Key configurada no painel
      }
    });
  }

  /*
  =================================
  INITIALIZE
  =================================
  */

  async initialize(): Promise<void> {
    try {
      logger.info(`[EvolutionAdapter] Inicializando whatsappId=${this.whatsappId}`);

      // 1. Verifica se a instância existe. Se não existir, cria e já configura o Webhook.
      await this.checkOrCreateInstance();

      // 2. Consulta o estado real da conexão
      const response = await this.api.get(
        `/instance/connectionState/${this.whatsapp.evolutionInstanceName}`
      );

      const instance = response.data?.instance;
      const state = instance?.state;

      if (state === "open") {
        this.status = "connected";
        this.phoneNumber = instance?.owner || instance?.me?.id || null;
        this.emitConnectionUpdate("connected");
      } else {
        this.status = "qrcode";
        this.emitConnectionUpdate("qrcode");

        // 3. Como aguarda conexão, vai buscar o QR Code e emite para o ecrã
        await this.getAndEmitQRCode();
      }

      logger.info(`[EvolutionAdapter] Status final: ${this.status}`);

    } catch (error: any) {
      logger.error(`[EvolutionAdapter] Erro ao inicializar: ${error.message}`);
      this.status = "disconnected";
      this.emitConnectionUpdate("disconnected");
      throw new WhatsAppAdapterError("Erro ao inicializar Evolution", "EVOLUTION_INIT_ERROR", error);
    }
  }

  /*
  =================================
  MÉTODOS DE AUTOMAÇÃO (CRIAÇÃO, WEBHOOK E QR CODE)
  =================================
  */

  private async checkOrCreateInstance(): Promise<void> {
    try {
      // Tenta consultar a instância
      await this.api.get(`/instance/connectionState/${this.whatsapp.evolutionInstanceName}`);
      logger.info(`[EvolutionAdapter] Instância ${this.whatsapp.evolutionInstanceName} confirmada no servidor.`);

      // Força a atualização do Webhook para garantir que as opções estão sempre habilitadas
      await this.setWebhook();

    } catch (error: any) {
      // Se retornar 404, significa que a instância não existe na API. Vamos criá-la!
      if (error.response && error.response.status === 404) {
        logger.info(`[EvolutionAdapter] Instância não encontrada. A criar ${this.whatsapp.evolutionInstanceName}...`);

        await this.api.post("/instance/create", {
          instanceName: this.whatsapp.evolutionInstanceName,
          token: this.whatsapp.evolutionApiKey,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS" // Padrão da Evolution v2.3
        });

        logger.info(`[EvolutionAdapter] Instância criada com sucesso!`);

        // Assim que cria, configura o Webhook
        await this.setWebhook();
      } else {
        throw error;
      }
    }
  }

  private async setWebhook(): Promise<void> {
    try {
      const backendUrl = process.env.BACKEND_URL;

      if (!backendUrl) {
        logger.warn(`[EvolutionAdapter] AVISO: BACKEND_URL não está definido no .env. O Webhook não será configurado automaticamente.`);
        return;
      }

      // Monta a URL exata do Webhook para esta conexão
      const webhookUrl = `${backendUrl}/evolution/webhook/${this.whatsappId}`;

      // Dispara para a Evolution ativar as opções e setar a URL
      await this.api.post(`/webhook/set/${this.whatsapp.evolutionInstanceName}`, {
        webhook: {
          enabled: true,         // <-- Faltava isto!
          url: webhookUrl,
          byEvents: false,       // <-- Corrigido para o padrão exato
          base64: true,          // Mantemos true para receber imagens e áudios
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "PRESENCE_UPDATE",
            "CHATS_UPSERT"
          ]
        }
      });

      logger.info(`[EvolutionAdapter] Webhook habilitado e configurado com sucesso para: ${webhookUrl}`);
    } catch (error: any) {
      // Captura de erro aprimorada para vermos exatamente o que a Evolution reclama se falhar
      const evoError = error.response?.data?.message || error.response?.data?.response;
      const errorMsg = Array.isArray(evoError) ? evoError[0] : (JSON.stringify(evoError) || error.message);

      logger.error(`[EvolutionAdapter] Erro ao configurar Webhook: ${errorMsg}`);
    }
  }

  private async getAndEmitQRCode(): Promise<void> {
    try {
      logger.info(`[EvolutionAdapter] A solicitar QR Code para ${this.whatsapp.evolutionInstanceName}...`);

      const response = await this.api.get(`/instance/connect/${this.whatsapp.evolutionInstanceName}`);
      const base64 = response.data?.base64;

      if (base64) {
        this.emitQRCode(base64);
      }
    } catch (error: any) {
      logger.error(`[EvolutionAdapter] Erro ao buscar QR Code: ${error.message}`);
    }
  }

  /*
  =================================
  DISCONNECT
  =================================
  */

  async disconnect(): Promise<void> {
    try {
      await this.api.post(`/instance/logout/${this.whatsapp.evolutionInstanceName}`);
      this.status = "disconnected";
      this.emitConnectionUpdate("disconnected");
    } catch (error) {
      throw new WhatsAppAdapterError("Erro ao desconectar Evolution", "EVOLUTION_DISCONNECT_ERROR", error);
    }
  }

  /*
  =================================
  SEND MESSAGE
  =================================
  */

  async sendMessage(options: ISendMessageOptions): Promise<IWhatsAppMessage> {
    try {
      const { to, body, mediaUrl, caption, mediaType } = options;
      let response;

      if (!mediaUrl) {
        response = await this.api.post(
          `/message/sendText/${this.whatsapp.evolutionInstanceName}`,
          { number: to, text: body }
        );
      } else {
        response = await this.api.post(
          `/message/sendMedia/${this.whatsapp.evolutionInstanceName}`,
          {
            number: to,
            media: mediaUrl,
            mediatype: mediaType || "image",
            caption: caption || ""
          }
        );
      }

      return {
        id: response.data?.key?.id || String(Date.now()),
        from: this.phoneNumber || "me",
        to,
        body: body || caption || "",
        timestamp: Date.now(),
        fromMe: true
      };
    } catch (error: any) {
      logger.error(`[EvolutionAdapter] Erro sendMessage: ${error.message}`);
      throw new WhatsAppAdapterError("Erro ao enviar mensagem", "EVOLUTION_SEND_ERROR", error);
    }
  }

  async sendTextMessage(to: string, body: string): Promise<IWhatsAppMessage> {
    return this.sendMessage({ to, body });
  }

  async sendMediaMessage(to: string, mediaUrl: string, mediaType: string, caption?: string): Promise<IWhatsAppMessage> {
    return this.sendMessage({ to, mediaUrl, mediaType: mediaType as any, caption });
  }

  /*
  =================================
  PROFILE & UTILS
  =================================
  */

  async getProfilePicture(jid: string): Promise<string | null> {
    try {
      const response = await this.api.get(
        `/chat/fetchProfilePictureUrl/${this.whatsapp.evolutionInstanceName}`,
        { params: { number: jid } }
      );
      return response.data?.profilePictureUrl || null;
    } catch {
      return null;
    }
  }

  async getStatus(): Promise<string | null> {
    return null;
  }

  async getProfileInfo(jid: string): Promise<IProfileInfo | null> {
    const picture = await this.getProfilePicture(jid);
    return { pictureUrl: picture || undefined };
  }

  /*
  =================================
  CONNECTION E EMITTERS
  =================================
  */

  getConnectionStatus(): ConnectionStatus { return this.status; }
  getPhoneNumber(): string | null { return this.phoneNumber; }

  onMessage(callback: (message: IWhatsAppMessage) => void): void { this.messageCallbacks.push(callback); }
  onConnectionUpdate(callback: (status: ConnectionStatus) => void): void { this.connectionCallbacks.push(callback); }
  onQRCode(callback: (qr: string) => void): void { this.qrCallbacks.push(callback); }

  public emitMessage(message: IWhatsAppMessage): void {
    this.messageCallbacks.forEach(cb => { try { cb(message); } catch (err) {} });
  }

  public emitConnectionUpdate(status: ConnectionStatus): void {
    this.status = status;
    this.connectionCallbacks.forEach(cb => { try { cb(status); } catch (err) {} });
  }

  public emitQRCode(qr: string): void {
    this.qrCallbacks.forEach(cb => { try { cb(qr); } catch (err) {} });
  }

  async sendPresenceUpdate(jid: string, type: "available" | "unavailable" | "composing" | "recording"): Promise<void> {
    try {
      await this.api.post(`/chat/sendPresence/${this.whatsapp.evolutionInstanceName}`, { number: jid, presence: type });
    } catch { }
  }

  getRawClient(): any { return this.api; }
}
