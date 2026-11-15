/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Panel } from './panel';

export interface ActionItemView {
  type: string;
  label: string;
  to?: string;
}

export function ActionItemsCard({ items }: { items: ActionItemView[] }) {
  return (
    <Panel title="Action required">
      {items.length === 0 ? (
        <p className="text-muted-foreground">Nothing needs your attention.</p>
      ) : (
        <ul className="divide-y">
          {items.map((it, i) => (
            <li key={`${it.type}-${i}`} className="py-2">
              {it.to ? (
                <Link to={it.to} className="underline-offset-4 hover:underline">
                  {it.label}
                </Link>
              ) : (
                it.label
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
