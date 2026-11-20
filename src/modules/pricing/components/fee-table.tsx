import { METHOD_LABEL, type Fee, type FeeMethod } from '../domain/pricing.schema'
import { FeeRate } from './fee-rate'

/**
 * One semantic <table> in the DOM, two presentations: a table at md+, stacked
 * cards below it via data-label. No duplicated DOM, no JS. UI.md §5.1.
 */
export function FeeTable({ fees, caption }: { fees: Fee[]; caption: string }) {
  // Deduplicate by method, keeping banded rows grouped under their method.
  const byMethod = new Map<FeeMethod, Fee[]>()
  for (const f of fees) {
    const list = byMethod.get(f.method) ?? []
    list.push(f)
    byMethod.set(f.method, list)
  }

  return (
    <div className="table-scroll">
      <table className="data-table data-table--zebra">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Payment method</th>
            <th scope="col">Published rate</th>
          </tr>
        </thead>
        <tbody>
          {[...byMethod.entries()].map(([method, rows]) => (
            <tr key={method}>
              <th scope="row">{METHOD_LABEL[method]}</th>
              <td data-label="Published rate">
                {rows.length === 1 ? (
                  <FeeRate fee={rows[0]!} />
                ) : (
                  <span className="inline-flex flex-col items-end gap-2 md:items-start">
                    {rows.map((r, i) => (
                      <span key={i} className="inline-flex flex-col items-end md:items-start">
                        <FeeRate fee={r} />
                      </span>
                    ))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
