interface Column<T> {
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
}

export function Table<T>({ columns, data, keyExtractor, emptyMessage = "Nenhum registro encontrado." }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted">
          <tr>{columns.map((col, i) => <th key={i} className={["px-4 py-3 text-left font-medium", col.className].join(" ")}>{col.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted">{emptyMessage}</td></tr>
          ) : (
            data.map((row, idx) => (
              <tr key={keyExtractor(row)} className={[idx % 2 === 0 ? "bg-background" : "bg-surface", "hover:bg-border transition-colors"].join(" ")}>
                {columns.map((col, i) => <td key={i} className={["px-4 py-3", col.className].join(" ")}>{col.render(row)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
