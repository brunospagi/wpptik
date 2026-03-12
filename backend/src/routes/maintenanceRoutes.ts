import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import { cleanFlowbuilderOrphans } from "../controllers/MaintenanceController";

const maintenanceRoutes = express.Router();

maintenanceRoutes.post("/maintenance/cleanup/flowbuilder", isAuth, isSuper, cleanFlowbuilderOrphans);

export default maintenanceRoutes;
