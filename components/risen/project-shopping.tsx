'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, X } from 'lucide-react';
import { formatOre, formatOreExact, formatQuantity, type ShoppingTotals } from '@/lib/risen/money';

/**
 * Shopping lists for one project.
 *
 * Every total shown here is computed on the server from integer øre and simply
 * rendered — the client never adds prices up itself, because the numbers feed a
 * budget and the only defensible source is the stored rows.
 */

interface ShoppingItemRow {
  id: string;
  name: string;
  quantityMilli: number;
  unit: string;
  estimatedUnitPriceOre: number | null;
  actualUnitPriceOre: number | null;
  status: string;
  supplier: string | null;
  budgetLineId: string | null;
}

interface ShoppingListRow {
  id: string;
  name: string;
  status: string;
  totals: ShoppingTotals;
}

const statusLabels: Record<string, string> = {
  planned: 'Planlagt',
  needs_decision: 'Må avklares',
  ready: 'Klar til kjøp',
  purchased: 'Kjøpt',
  cancelled: 'Kansellert',
};

export function ProjectShopping({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingListRow[]>([]);
  const [items, setItems] = useState<Record<string, ShoppingItemRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/shopping`);
      const body = (await response.json()) as { lists: ShoppingListRow[] };
      setLists(body.lists);
      const loaded: Record<string, ShoppingItemRow[]> = {};
      await Promise.all(
        body.lists.map(async list => {
          const itemResponse = await fetch(`/api/shopping/${list.id}/items`);
          const itemBody = (await itemResponse.json()) as { items: ShoppingItemRow[] };
          loaded[list.id] = itemBody.items;
        }),
      );
      setItems(loaded);
    } catch {
      setError('Kunne ikke hente innkjøpslistene.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createList(event: FormEvent) {
    event.preventDefault();
    if (!newListName.trim()) return;
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/shopping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName }),
    });
    if (!response.ok) {
      setError('Kunne ikke lage listen. Navnet er beholdt.');
      return;
    }
    setNewListName('');
    await load();
    router.refresh();
  }

  async function addItem(listId: string, form: HTMLFormElement) {
    const data = new FormData(form);
    setError(null);
    const response = await fetch(`/api/shopping/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        quantity: data.get('quantity'),
        unit: data.get('unit'),
        estimatedUnitPrice: data.get('estimatedUnitPrice'),
      }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { errors?: string[] };
      setError(body.errors?.[0] ?? 'Kunne ikke lagre produktet.');
      return;
    }
    form.reset();
    // The form stays open so several items can go in one after another; focus
    // goes back to the name field so that never needs the mouse.
    (form.elements.namedItem('name') as HTMLInputElement | null)?.focus();
    await load();
    router.refresh();
  }

  async function setStatus(itemId: string, status: string) {
    await fetch(`/api/shopping-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
    router.refresh();
  }

  if (loading && lists.length === 0) return <p className="panel-empty">Laster innkjøp…</p>;

  return (
    <div className="shopping">
      {error && (
        <p className="work-failure" role="alert">
          {error}
        </p>
      )}

      {lists.length === 0 && (
        <div className="work-empty">
          <h3>Ingen innkjøpsliste ennå</h3>
          <p>Lag en liste for materialer, utstyr eller andre prosjektkostnader.</p>
        </div>
      )}

      {lists.map(list => {
        const rows = items[list.id] ?? [];
        return (
          <section className="shopping-list" key={list.id}>
            <header>
              <h4>{list.name}</h4>
              <span className="count-tag tnum">
                {list.totals.purchasedCount} av {list.totals.itemCount} kjøpt
              </span>
            </header>

            {rows.length === 0 ? (
              <p className="panel-empty">
                Ingen produkter ennå. Legg til det som må kjøpes, så regnes kostnaden med i
                prosjektets prognose.
              </p>
            ) : (
            <table className="risen-table">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th className="num">Mengde</th>
                  <th className="num">Enhetspris</th>
                  <th className="num">Sum</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const unitOre = row.actualUnitPriceOre ?? row.estimatedUnitPriceOre;
                  const lineOre = unitOre === null ? null : Math.round((row.quantityMilli * unitOre) / 1000);
                  return (
                    <tr key={row.id} className={row.status === 'cancelled' ? 'is-cancelled' : ''}>
                      <td>
                        <strong>{row.name}</strong>
                        {row.supplier && <small>{row.supplier}</small>}
                      </td>
                      <td className="num tnum" data-label="Mengde">
                        {formatQuantity(row.quantityMilli)} {row.unit}
                      </td>
                      <td className="num tnum" data-label="Enhetspris">
                        {unitOre === null ? '—' : formatOreExact(unitOre)}
                        {row.actualUnitPriceOre === null && row.estimatedUnitPriceOre !== null && (
                          <small>estimert</small>
                        )}
                      </td>
                      <td className="num tnum" data-label="Sum">{lineOre === null ? '—' : formatOreExact(lineOre)}</td>
                      <td>
                        <span className={`status-pill shopping-${row.status}`}>
                          {statusLabels[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="num">
                        {row.status !== 'purchased' && row.status !== 'cancelled' && (
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setStatus(row.id, 'purchased')}
                            aria-label={`Merk «${row.name}» som kjøpt`}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {row.status !== 'cancelled' && (
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setStatus(row.id, 'cancelled')}
                            aria-label={`Kanseller «${row.name}»`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}

            {rows.length > 0 && (
            <dl className="shopping-totals">
              <div>
                <dt>Estimert</dt>
                <dd className="tnum">{formatOre(list.totals.estimatedOre)}</dd>
              </div>
              <div>
                <dt>Kjøpt</dt>
                <dd className="tnum">{formatOre(list.totals.purchasedOre)}</dd>
              </div>
              <div>
                <dt>Gjenstår</dt>
                <dd className="tnum">{formatOre(list.totals.remainingOre)}</dd>
              </div>
              <div className="is-total">
                <dt>Prognose</dt>
                <dd className="tnum">{formatOre(list.totals.forecastOre)}</dd>
              </div>
            </dl>
            )}

            {list.totals.forecastOre > 0 && (
              <p className="shopping-split">
                <span className="tnum">{formatOre(list.totals.budgetedOre)}</span> er dekket av en
                budsjettlinje, <span className="tnum">{formatOre(list.totals.unbudgetedOre)}</span> er ikke.
                Summen av de to er prognosen, slik at ingen kostnad telles to ganger.
              </p>
            )}

            {addingTo === list.id ? (
              <form
                className="shopping-add"
                onSubmit={event => {
                  event.preventDefault();
                  void addItem(list.id, event.currentTarget);
                }}
              >
                <input name="name" placeholder="Produkt" required maxLength={200} aria-label="Produkt" />
                <input name="quantity" placeholder="Mengde" defaultValue="1" aria-label="Mengde" />
                <input name="unit" placeholder="stk" defaultValue="stk" aria-label="Enhet" />
                <input name="estimatedUnitPrice" placeholder="Pris per enhet" aria-label="Estimert enhetspris" />
                <button type="submit">Legg til</button>
                <button type="button" className="ghost" onClick={() => setAddingTo(null)}>
                  Avbryt
                </button>
              </form>
            ) : (
              <button type="button" className="inline-add-trigger" onClick={() => setAddingTo(list.id)}>
                <Plus size={14} />
                Legg til produkt
              </button>
            )}
          </section>
        );
      })}

      <form className="shopping-new-list" onSubmit={createList}>
        <label className="sr-only" htmlFor="new-list">
          Ny innkjøpsliste
        </label>
        <input
          id="new-list"
          value={newListName}
          onChange={event => setNewListName(event.target.value)}
          placeholder="Ny liste, for eksempel «Materialer til steinmuren»"
          maxLength={120}
        />
        <button type="submit" disabled={!newListName.trim()}>
          Lag liste
        </button>
      </form>
    </div>
  );
}
