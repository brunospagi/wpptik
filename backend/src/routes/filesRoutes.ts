import express from "express";
import isAuth from "../middleware/isAuth";
import { createUpload } from "../config/uploadFactory";
import validateUploadedFiles from "../middleware/validateUploadedFiles";

import * as FilesController from "../controllers/FilesController";

const upload = createUpload({
  privacy: "public",
  subfolder: "files",
  dynamic: true,
  paramId: "fileId"
});

const filesRoutes = express.Router();

filesRoutes.get("/files/list", isAuth, FilesController.list);
filesRoutes.get("/files", isAuth, FilesController.index);
filesRoutes.post("/files", isAuth, upload.array("files"), FilesController.store);
filesRoutes.put("/files/:fileId", isAuth, upload.array("files"), FilesController.update);
filesRoutes.get("/files/:fileId", isAuth, FilesController.show);
filesRoutes.delete("/files/:fileId", isAuth, FilesController.remove);
filesRoutes.delete("/files", isAuth, FilesController.removeAll);

export default filesRoutes;
