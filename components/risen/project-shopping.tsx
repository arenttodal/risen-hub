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
 *
 * The layout is deliberately dense. An earlier version gave each list a table
 * with five headers and a block of four oversized figures, then repeated the
 * same four figures for the project — which on a project with one list meant
 * showing the identical number twice in 27px type. A row here is one line:
 * name, what it costs, and what you can do about it. Anything that would repeat
 * a figure already on screen is left out rather than restated.
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

/**
 * Only the states a row can actually be in that are worth saying out loud.
 * `planned` is the default and every row would wear it, so it says nothing;
 * `purchased` is already visible in the row's own styling. What is left is the
 * exceptions, which is the only time a label earns its width.
 */
const exceptionLabels: Record<string, string> = {
  needs_decision: 'Må avklares',
  ready: 'Klar',
  cancelled: 'Kansellert',
};

export function ProjectShopping({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingListRow[]>([]);
  const [items, setItems] = useState<Record<string, ShoppingItemRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [namingList, setNamingList] = useState(false);
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
    setNamingList(false);
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

  // A per-list subtotal repeats the project total exactly when there is one
  // list, so it only appears once there is something to tell apart.
  const showListSums = lists.length > 1;

  return (
    <div className="shop">
      {error && (
        <p className="work-failure" role="alert">
          {error}
        </p>
      )}

      {lists.length === 0 && !namingList && (
        <p className="panel-empty">
          Ingen innkjøpsliste ennå.{' '}
          <button type="button" className="link-button" onClick={() => setNamingList(true)}>
            Lag en liste
          </button>{' '}
          for materialer eller utstyr.
        </p>
      )}

      {lists.map(list => {
        const rows = items[list.id] ?? [];
        const open = rows.filter(row => row.status !== 'cancelled');
        return (
          <section className="shop-list" key={list.id}>
            <header>
              <h4>{list.name}</h4>
              {showListSums && list.totals.forecastOre > 0 && (
                <span className="shop-list-sum tnum">{formatOre(list.totals.forecastOre)}</span>
              )}
              {open.length > 0 && (
                <span className="shop-count tnum">
                  {list.totals.purchasedCount}/{list.totals.itemCount}
                </span>
              )}
            </header>

            {rows.length > 0 && (
              <ul className="shop-items">
                {rows.map(row => {
                  const unitOre = row.actualUnitPriceOre ?? row.estimatedUnitPriceOre;
                  const lineOre = unitOre === null ? null : Math.round((row.quantityMilli * unitOre) / 1000);
                  const purchased = row.status === 'purchased';
                  const cancelled = row.status === 'cancelled';
                  const exception = exceptionLabels[row.status];
                  return (
                    <li
                      key={row.id}
                      className={`shop-item${purchased ? ' is-purchased' : ''}${cancelled ? ' is-cancelled' : ''}`}
                    >
                      <button
                        type="button"
                        className="shop-check"
                        disabled={cancelled}
                        aria-pressed={purchased}
                        aria-label={
                          purchased
                            ? `Merk «${row.name}» som ikke kjøpt`
                            : `Merk «${row.name}» som kjøpt`
                        }
                        onClick={() => setStatus(row.id, purchased ? 'planned' : 'purchased')}
                      >
                        {purchased && <Check size={12} />}
                      </button>

                      <span className="shop-name">
                        {row.name}
                        {row.supplier && <small>{row.supplier}</small>}
                      </span>

                      {/* Quantity and unit price read as one fact — "8 sekk ×
                          289,90 kr" is how a person says it — so they share a
                          cell instead of two columns that each need a header. */}
                      <span className="shop-spec tnum">
                        {formatQuantity(row.quantityMilli)} {row.unit}
                        {unitOre !== null && ` × ${formatOreExact(unitOre)}`}
                      </span>

                      {exception && <span className="shop-flag">{exception}</span>}

                      <span className="shop-sum tnum">
                        {lineOre === null ? '—' : formatOreExact(lineOre)}
                      </span>

                      {!cancelled && (
                        <button
                          type="button"
                          className="shop-drop"
                          onClick={() => setStatus(row.id, 'cancelled')}
                          aria-label={`Kanseller «${row.name}»`}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {addingTo === list.id ? (
              <form
                className="shop-add"
                onSubmit={event => {
                  event.preventDefault();
                  void addItem(list.id, event.currentTarget);
                }}
              >
                <input name="name" placeholder="Produkt" required maxLength={200} aria-label="Produkt" />
                <input name="quantity" defaultValue="1" aria-label="Mengde" />
                <input name="unit" defaultValue="stk" aria-label="Enhet" />
                <input name="estimatedUnitPrice" placeholder="Pris" aria-label="Estimert enhetspris" />
                <button type="submit" aria-label="Legg til produktet">
                  <Plus size={14} />
                </button>
                <button type="button" className="ghost" onClick={() => setAddingTo(null)} aria-label="Avbryt">
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button type="button" className="shop-add-trigger" onClick={() => setAddingTo(list.id)}>
                <Plus size={13} />
                Legg til produkt
              </button>
            )}
          </section>
        );
      })}

      {namingList ? (
        <form className="shop-new-list" onSubmit={createList}>
          <input
            autoFocus
            value={newListName}
            onChange={event => setNewListName(event.target.value)}
            placeholder="Navn på listen"
            maxLength={120}
            aria-label="Ny innkjøpsliste"
          />
          <button type="submit" disabled={!newListName.trim()}>
            Lag
          </button>
          <button type="button" className="ghost" onClick={() => setNamingList(false)}>
            Avbryt
          </button>
        </form>
      ) : (
        lists.length > 0 && (
          <button type="button" className="shop-add-trigger is-list" onClick={() => setNamingList(true)}>
            <Plus size={13} />
            Ny liste
          </button>
        )
      )}
    </div>
  );
}
