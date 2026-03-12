import React from "react";
import { List as ListIcon, Upload as UploadIcon, Filter as FilterIcon, Plus as PlusIcon, Trash2 } from "lucide-react";

// Dock de botões inspirado no layout do 21st.dev (chips com cantos arredondados, cores sólidas e contornos)
// Props esperadas:
// - onLists, onImport, onFilter, onNew, onClear (func)
// - disableImport, disableClear (bool)
// - extraRight (children) para botões adicionais à direita
// - className (string)
const ButtonDock = ({
  onLists,
  onImport,
  onFilter,
  onNew,
  onClear,
  disableImport,
  disableClear,
  extraRight,
  className,
}) => {
  return (
    <div className={`w-full flex flex-wrap items-center gap-2 ${className || ""}`}>
      <button
        onClick={onLists}
        className="shrink-0 px-4 py-2 text-sm font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2"
        type="button"
      >
        <ListIcon className="w-4 h-4" /> LISTAS
      </button>

      <button
        onClick={onImport}
        disabled={disableImport}
        className={`shrink-0 px-4 py-2 text-sm font-bold uppercase text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 flex items-center gap-2 ${disableImport ? "bg-pink-200 cursor-not-allowed" : "bg-pink-400 hover:bg-pink-500 focus:ring-pink-300"}`}
        type="button"
      >
        <UploadIcon className="w-4 h-4" /> IMPORTAR
      </button>

      <button
        onClick={onFilter}
        className="shrink-0 px-4 py-2 text-sm font-bold uppercase text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center gap-2"
        type="button"
      >
        <FilterIcon className="w-4 h-4" /> FILTRAR
      </button>

      <button
        onClick={onNew}
        className="shrink-0 px-4 py-2 text-sm font-bold uppercase text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center gap-2"
        type="button"
      >
        <PlusIcon className="w-4 h-4" /> NOVO
      </button>

      <div className="flex-1" />

      {onClear && (
        <button
          onClick={onClear}
          disabled={disableClear}
          className={`shrink-0 px-4 py-2 text-sm font-bold uppercase rounded-lg border flex items-center gap-2 focus:outline-none focus:ring-2 ${disableClear ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-red-700 border-red-300 hover:bg-red-50 focus:ring-red-200"}`}
          type="button"
        >
          <Trash2 className="w-4 h-4" /> LIMPAR ITENS DA LISTA
        </button>
      )}

      {extraRight}
    </div>
  );
};

export default ButtonDock;
