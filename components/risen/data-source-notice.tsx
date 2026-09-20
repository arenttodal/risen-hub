import { Database, TriangleAlert } from 'lucide-react';
import type { DataSource } from '@/lib/risen/types';

/**
 * Says plainly where the numbers on screen came from. Illustrative seed values
 * must never be presented as live records (CLAUDE.md rule 8).
 */
export function DataSourceNotice({ source, error }: { source: DataSource; error?: string }) {
  if (source === 'database') return null;

  if (error) {
    return (
      <p className="data-notice is-error" role="status">
        <TriangleAlert size={15} />
        <span>
          <strong>Databasen svarte ikke.</strong> Viser seed-data i stedet. Feil: {error}
        </span>
      </p>
    );
  }

  return (
    <p className="data-notice" role="status">
      <Database size={15} />
      <span>
        <strong>Seed-data.</strong> Ingen D1-database er koblet til, så tall, frister og fremdrift
        under er illustrative og ikke reelle registreringer.
      </span>
    </p>
  );
}
