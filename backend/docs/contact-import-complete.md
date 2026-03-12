# Sistema Completo de Importação de Contatos

## 📋 Visão Geral

Sistema robusto e pronto para produção com processamento assíncrono, tratamento de erros individuais, deduplicação automática, validações de segurança e auditoria completa.

---

## ✨ Recursos Implementados

### 🔴 **Críticos (Alta Prioridade)**

#### 1. **Tratamento de Erros Parciais & Resiliência**
- ✅ Try-catch individual para cada contato
- ✅ Array de erros detalhados: `{ row, number, error }`
- ✅ Importação continua mesmo com falhas individuais
- ✅ Relatório completo com sucessos e falhas

#### 2. **Processamento em Background (Bull Queue)**
- ✅ Fila `ImportContactsQueue` com Bull
- ✅ Máximo 2 importações simultâneas
- ✅ Notificação via Socket.IO quando concluir
- ✅ Jobs com retry automático

#### 3. **Auditoria & Histórico de Importações**
- ✅ Model `ContactImportLog` com todos os metadados
- ✅ Rastreamento completo: userId, status, stats, errors
- ✅ Integração com `AuditLogger` existente
- ✅ Endpoint para listar histórico com filtros

#### 4. **Validações & Limites de Segurança**
- ✅ Limite de 10MB para arquivos
- ✅ Máximo 10.000 contatos por importação
- ✅ Validação de extensão (apenas .xlsx, .xls, .csv)
- ✅ Validação de número mínimo 10 dígitos

### 🟡 **Importantes (Implementados)**

#### 5. **Relatórios Detalhados**
- ✅ Retorno completo: `{ total, processed, created, updated, skipped, failed, duplicatesInFile }`
- ✅ Array de erros com detalhes de linha e motivo
- ✅ Tempo de execução calculado

#### 6. **Cancelamento & Controle**
- ✅ Flag `cancelled` no job
- ✅ Verificação periódica durante processamento
- ✅ Endpoint `POST /contacts/import-jobs/:jobId/cancel`
- ✅ Status atualizado no log

#### 7. **Deduplicação Inteligente no Lote**
- ✅ Agrupamento por número canônico antes do processamento
- ✅ Merge de dados duplicados (prioriza mais completo)
- ✅ Relatório de duplicados removidos

---

## 📡 Endpoints

### **Importação Assíncrona**

```http
POST /contacts/import-async
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: arquivo Excel/CSV (opcional)
- tagMapping: JSON com mapeamento de tags (opcional)
- whatsappId: ID da conexão WhatsApp (opcional)
- silentMode: boolean (opcional)
- dryRun: boolean (opcional)

Response 202:
{
  "message": "Importação iniciada em background",
  "jobId": "uuid",
  "status": "queued"
}
```

### **Consultar Status de Job**

```http
GET /contacts/import-jobs/:jobId/status
Authorization: Bearer <token>

Response 200:
{
  "jobId": "uuid",
  "status": "processing", // pending|processing|completed|failed|cancelled
  "progress": 45,
  "log": {
    "id": 123,
    "totalRecords": 1000,
    "processedRecords": 450,
    "createdRecords": 350,
    "updatedRecords": 90,
    "failedRecords": 10,
    "executionTime": 120
  }
}
```

### **Cancelar Importação**

```http
POST /contacts/import-jobs/:jobId/cancel
Authorization: Bearer <token>

Response 200:
{
  "message": "Job marcado para cancelamento",
  "jobId": "uuid"
}
```

### **Listar Histórico de Importações**

```http
GET /contacts/import-logs?status=completed&pageNumber=1
Authorization: Bearer <token>

Query Params:
- userId: filtrar por usuário
- status: pending|processing|completed|failed|cancelled
- source: file|tags|api
- searchParam: buscar por jobId ou fileName
- pageNumber: página (default: 1)

Response 200:
{
  "logs": [...],
  "count": 50,
  "hasMore": true
}
```

### **Detalhes de Log Específico**

```http
GET /contacts/import-logs/:id
Authorization: Bearer <token>

Response 200:
{
  "id": 123,
  "jobId": "uuid",
  "source": "file",
  "fileName": "contatos.xlsx",
  "status": "completed",
  "totalRecords": 1000,
  "createdRecords": 900,
  "updatedRecords": 80,
  "failedRecords": 20,
  "errors": [
    { "row": 15, "number": "invalid", "error": "Número inválido" }
  ],
  "options": { ... },
  "executionTime": 180,
  "user": { "id": 1, "name": "Admin" }
}
```

---

## 🔄 Fluxo de Importação

```
1. Frontend envia POST /contacts/import-async
   ↓
2. Backend valida arquivo (tamanho, extensão)
   ↓
3. Cria ContactImportLog (status: pending)
   ↓
4. Adiciona job à fila Bull (ImportContactsQueue)
   ↓
5. Retorna 202 com jobId
   ↓
6. Worker processa job em background
   ↓
7. Para cada contato:
   - Try-catch individual
   - Deduplica por número
   - Valida número
   - Cria/atualiza contato
   - Aplica tags
   - Em caso de erro: registra e continua
   ↓
8. Atualiza ContactImportLog (status: completed/failed)
   ↓
9. Emite evento Socket.IO para frontend
   ↓
10. Cria log de auditoria
```

---

## 📊 Estrutura de Dados

### **ContactImportLog Model**

```typescript
{
  id: number;
  companyId: number;
  userId: number;
  jobId: string; // UUID
  source: string; // 'file' | 'tags' | 'api'
  fileName: string;
  status: string; // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalRecords: number;
  processedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  errors: string; // JSON array
  options: string; // JSON object
  startedAt: Date;
  completedAt: Date;
  executionTime: number; // segundos
  createdAt: Date;
  updatedAt: Date;
}
```

### **Resultado da Importação**

```typescript
{
  total: number; // Total original (antes dedup)
  processed: number; // Total processado (após dedup)
  created: number;
  updated: number;
  skipped: number;
  tagged: number;
  failed: Array<{ row: number; number: string; error: string }>;
  duplicatesInFile: number;
  perTagApplied: Record<string, number>;
  summary: {
    success: number;
    errors: number;
    duplicates: number;
    executionTime: number;
  }
}
```

---

## 🔒 Validações de Segurança

| Validação | Limite | Ação |
|-----------|--------|------|
| Tamanho do arquivo | 10MB | Rejeita com erro 400 |
| Extensão | .xlsx, .xls, .csv | Rejeita com erro 400 |
| Contatos por importação | 10.000 | Rejeita com erro 400 |
| Tamanho mínimo do número | 10 dígitos | Registra erro individual |
| Jobs simultâneos | 2 | Enfileira automaticamente |

---

## 📈 Monitoramento

### **Events Socket.IO**

O sistema emite eventos em tempo real via Socket.IO:

```javascript
// Namespace: /workspace-{companyId}
io.of(`/workspace-${companyId}`).on('company-${companyId}-import-status', (data) => {
  // data.jobId
  // data.status: 'processing' | 'completed' | 'failed' | 'cancelled'
  // data.progress: 0-100
  // data.result: { total, created, updated, failed }
});
```

### **Bull Board**

Acesse o painel de filas em `/admin/queues` (se habilitado).

---

## 🛠️ Configuração

### **Variáveis de Ambiente**

```env
# Redis (obrigatório)
REDIS_URI=redis://localhost:6379

# Bull Board (opcional)
BULL_BOARD=true
BULL_USER=admin
BULL_PASS=senha_segura
```

### **Migrations**

Execute as migrations:

```bash
cd backend
npm run migrate
```

Migrations criadas:
- `20251114000100-create-contact-tag-import-presets.ts`
- `20251114000200-create-contact-import-logs.ts`

---

## 🧪 Testando

### **Importação com Arquivo**

```bash
curl -X POST http://localhost:8080/contacts/import-async \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@contatos.xlsx" \
  -F "dryRun=true"
```

### **Consultar Status**

```bash
curl http://localhost:8080/contacts/import-jobs/{jobId}/status \
  -H "Authorization: Bearer TOKEN"
```

### **Listar Logs**

```bash
curl "http://localhost:8080/contacts/import-logs?status=completed" \
  -H "Authorization: Bearer TOKEN"
```

---

## 📝 Logs e Auditoria

Todos os eventos importantes são registrados:

1. **Início da importação** → `AuditLog` (action: "Importação Iniciada")
2. **Conclusão** → `AuditLog` (action: "Importação Concluída")
3. **Cancelamento** → `AuditLog` (action: "Cancelamento")
4. **Erros** → Logger + ContactImportLog.errors

---

## 🚀 Diferenças da Implementação Anterior

| Recurso | Antes | Agora |
|---------|-------|-------|
| Processamento | Síncrono | Assíncrono (fila) |
| Erros | Parava tudo | Continua processando |
| Deduplicação | Não tinha | Automática no lote |
| Limites | Sem validação | 10MB, 10k contatos |
| Histórico | Não tinha | Completo com filtros |
| Cancelamento | Não tinha | Suportado |
| Auditoria | Parcial | Completa |
| Relatórios | Básico | Detalhado com erros |
| Notificações | Não tinha | Socket.IO em tempo real |

---

## ✅ Checklist de Produção

- [x] Tratamento de erros individuais
- [x] Processamento assíncrono com Bull
- [x] Auditoria completa
- [x] Validações de segurança
- [x] Deduplicação no lote
- [x] Limites de tamanho e quantidade
- [x] Histórico de importações
- [x] Cancelamento de jobs
- [x] Relatórios detalhados
- [x] Socket.IO para notificações
- [x] Migrations
- [x] Logs estruturados
- [x] Documentação completa

---

## 🎯 Resultado

Sistema de importação **100% robusto** e pronto para produção com:

- ✅ Zero downtime durante importações grandes
- ✅ Resiliência a falhas individuais
- ✅ Rastreabilidade completa
- ✅ Segurança contra abuso
- ✅ UX melhorada (async + notificações)
- ✅ Manutenibilidade (logs + auditoria)
- ✅ Escalabilidade (fila + workers)

**Todas as melhorias sugeridas foram implementadas!** 🎉
