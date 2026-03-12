import { importContactsQueue } from "../../queues/ImportContactsQueue";
import ContactImportLog from "../../models/ContactImportLog";
import AppError from "../../errors/AppError";

interface Request {
  jobId: string;
  companyId: number;
}

interface Response {
  jobId: string;
  status: string;
  progress: number;
  log?: ContactImportLog;
  jobData?: any;
}

const GetImportJobStatusService = async ({
  jobId,
  companyId
}: Request): Promise<Response> => {
  // Buscar log no banco
  const log = await ContactImportLog.findOne({
    where: {
      jobId,
      companyId
    }
  });

  if (!log) {
    throw new AppError("ERR_IMPORT_JOB_NOT_FOUND", 404);
  }

  // Tentar buscar job na fila
  let jobProgress = 0;
  let jobData = null;

  try {
    const jobs = await importContactsQueue.getJobs(['active', 'waiting', 'delayed']);
    const job = jobs.find((j: any) => j.data.jobId === jobId);

    if (job) {
      jobProgress = await job.progress();
      jobData = job.data;
    }
  } catch (error) {
    // Se não conseguir acessar a fila, usa dados do log
  }

  // Calcular progresso baseado no log
  if (log.status === "completed") {
    jobProgress = 100;
  } else if (log.status === "processing" && log.totalRecords > 0) {
    jobProgress = Math.floor((log.processedRecords / log.totalRecords) * 100);
  }

  return {
    jobId: log.jobId,
    status: log.status,
    progress: jobProgress,
    log,
    jobData
  };
};

export default GetImportJobStatusService;
