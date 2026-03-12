import React from "react";
import { Tooltip } from "@material-ui/core";
import { GitMerge } from "lucide-react";

const DuplicateContactsButton = ({ visible, loading, onClick, tooltipProps }) => {
  if (!visible) {
    return null;
  }

  return (
    <Tooltip
      {...tooltipProps}
      title={tooltipProps?.title || "Deduplicar contatos"}
    >
      <span>
        <button
          onClick={onClick}
          disabled={loading}
          className="shrink-0 w-10 h-10 flex items-center justify-center text-indigo-600 bg-white dark:bg-gray-800 border border-indigo-500 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Gerenciar duplicados"
        >
          <GitMerge className="w-5 h-5" />
        </button>
      </span>
    </Tooltip>
  );
};

export default DuplicateContactsButton;
