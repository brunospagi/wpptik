import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  ConfirmationNumber,
} from "@mui/icons-material";
import React, { memo } from "react";
import TextField from "@mui/material/TextField";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { Handle } from "react-flow-renderer";
import { Typography, Box } from "@material-ui/core";
import { SiOpenai } from "react-icons/si";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  console.log(12, "openaiNode", data);

  const tbi = data?.typebotIntegration || {};
  let attachmentsCount = 0;
  try {
    const atts = typeof tbi.attachments === 'string' ? JSON.parse(tbi.attachments) : tbi.attachments;
    attachmentsCount = Array.isArray(atts) ? atts.length : 0;
  } catch (_) {
    attachmentsCount = 0;
  }
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        padding: "8px",
        borderRadius: "8px",
        boxShadow: "rgba(0, 0, 0, 0.05) 0px 3px 5px",
        border: "1px solid rgba(33, 94, 151, 0.25)",
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          background: "#0872b9",
          width: "18px",
          height: "18px",
          top: "20px",
          left: "-12px",
          cursor: "pointer",
        }}
        onConnect={(params) => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffff",
            width: "10px",
            height: "10px",
            marginLeft: "2.9px",
            marginBottom: "1px",
            pointerEvents: "none",
          }}
        />
      </Handle>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 5,
          top: 5,
          cursor: "pointer",
          gap: 6,
        }}
      >
        <ContentCopy
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          sx={{ width: "12px", height: "12px", color: "#F7953B" }}
        />

        <Delete
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          sx={{ width: "12px", height: "12px", color: "#F7953B" }}
        />
      </div>
      <div
        style={{
          color: "#ededed",
          fontSize: "16px",
          flexDirection: "row",
          display: "flex",
        }}
      >
       <SiOpenai
          sx={{
            width: "16px",
            height: "16px",
            marginRight: "4px",
            marginTop: "4px",
            color: "#3aba38"
          }}
        />
        <div style={{ color: "#232323", fontSize: "16px" }}>OpenAI/Gemini</div>
      </div>
      <div style={{ color: "#232323", fontSize: "12px", width: 180 }}>
        <div style={{ backgroundColor: "#F6EEEE", marginBottom: "6px", borderRadius: "5px", padding: "6px" }}>
          <div style={{ textAlign: "center", fontWeight: 600 }}>OpenAI/Gemini</div>
        </div>

        <div style={{ lineHeight: 1.3 }}>
          <div><strong>Ação:</strong> {tbi.name || "—"}</div>
          <div><strong>Integração:</strong> {tbi.integrationId ? `#${tbi.integrationId}` : "—"}</div>
          <div><strong>Fila:</strong> {tbi.queueId ? `#${tbi.queueId}` : "—"}</div>
          <div><strong>Modelo:</strong> {tbi.model || "—"}</div>
          <div><strong>Temp.:</strong> {tbi.temperature ?? "—"}</div>
          <div><strong>Máx. Msgs:</strong> {tbi.maxMessages ?? "—"}</div>
          <div><strong>Anexos:</strong> {attachmentsCount}</div>
        </div>
      </div>
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          background: "#0872b9",
          width: "18px",
          height: "18px",
          top: "70%",
          right: "-11px",
          cursor: "pointer",
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffff",
            width: "10px",
            height: "10px",
            marginLeft: "2.9px",
            marginBottom: "1px",
            pointerEvents: "none",
          }}
        />
      </Handle>
    </div>
  );
});
