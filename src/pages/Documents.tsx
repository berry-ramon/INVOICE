import { Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge, Button, Input, PageTitle } from "@/components/ui";
import { grandTotal, money } from "@/lib/data";
import { useAppStore } from "@/store/app";
import type { DocumentStatus } from "@/types/models";

const tabs = ["All", "Draft", "Issued", "Paid", "Overdue"] as const;

export function Documents() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");
  const { documents, setCreateOpen } = useAppStore();
  const navigate = useNavigate();

  const visible = useMemo(
    () =>
      documents.filter(
        (doc) =>
          (tab === "All" || doc.status === tab) &&
          `${doc.number} ${doc.contact}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [documents, query, tab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: documents.length };
    for (const doc of documents) {
      c[doc.status] = (c[doc.status] ?? 0) + 1;
    }
    return c;
  }, [documents]);

  return (
    <div className="page">
      <PageTitle
        title="Documents"
        subtitle={
          documents.length === 0
            ? "Your invoices, receipts and quotations appear here"
            : `${documents.length} file${documents.length === 1 ? "" : "s"} stored on this device`
        }
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> New document
          </Button>
        }
      />

      <div className="tabs">
        {tabs.map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
            {item !== "All" && <span>{counts[item] ?? 0}</span>}
          </button>
        ))}
      </div>

      <div className="list-tools">
        <label className="search-input">
          <Search size={18} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number or contact"
          />
        </label>
        <Button variant="secondary">
          <Filter size={17} /> Filters
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <span />
            <i />
          </div>
          <h2>No documents yet</h2>
          <p>Create your first invoice, receipt or quotation.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={17} /> Create document
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <span />
            <i />
          </div>
          <h2>Nothing matches</h2>
          <p>Try another filter or clear the search.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setTab("All");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <section className="documents-table">
          <div className="table-head">
            <span>Document</span>
            <span>Client</span>
            <span>Date</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {visible.map((doc) => (
            <button
              className="table-row"
              key={doc.id}
              onClick={() => navigate(`/editor/${doc.id}`)}
            >
              <div className="doc-cell">
                <div className="mini-paper">
                  <i style={{ background: doc.accent || "#0B6B57" }} />
                </div>
                <div>
                  <strong>{doc.number || "Untitled"}</strong>
                  <span>{doc.type}</span>
                </div>
              </div>
              <span>{doc.contact || "No client"}</span>
              <span>
                {new Date(doc.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <strong>{money(grandTotal(doc), doc.currency)}</strong>
              <Badge tone={doc.status}>{doc.status}</Badge>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
