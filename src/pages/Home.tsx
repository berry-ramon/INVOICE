import {
  ArrowRight,
  Banknote,
  Clock3,
  FileCheck2,
  FilePlus2,
  Plus,
  ReceiptText,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, Button, PageTitle } from "@/components/ui";
import { grandTotal, money } from "@/lib/data";
import { useAppStore } from "@/store/app";

export function Home() {
  const { documents, setCreateOpen } = useAppStore();
  const navigate = useNavigate();

  const unpaid = documents
    .filter((d) => d.status === "Issued" || d.status === "Overdue")
    .reduce((sum, d) => sum + grandTotal(d), 0);

  const unpaidCount = documents.filter(
    (d) => d.status === "Issued" || d.status === "Overdue",
  ).length;

  const paidThisMonth = documents
    .filter((d) => {
      if (d.status !== "Paid") return false;
      const now = new Date();
      const date = new Date(d.date);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, d) => sum + grandTotal(d), 0);

  const docsThisMonth = documents.filter((d) => {
    const now = new Date();
    const date = new Date(d.date);
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

  const isEmpty = documents.length === 0;

  return (
    <div className="page">
      <PageTitle
        title={isEmpty ? "Welcome to Hatiri" : "Overview"}
        subtitle={
          isEmpty
            ? "Create your first invoice, receipt or quotation to get started."
            : "Here's what's happening with your business."
        }
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> Create
          </Button>
        }
      />

      <section className="quick-create">
        <button onClick={() => setCreateOpen(true)}>
          <span>
            <FilePlus2 />
          </span>
          <strong>Invoice</strong>
          <small>Request payment</small>
        </button>
        <button onClick={() => setCreateOpen(true)}>
          <span>
            <ReceiptText />
          </span>
          <strong>Receipt</strong>
          <small>Confirm payment</small>
        </button>
        <button onClick={() => setCreateOpen(true)}>
          <span>
            <FileCheck2 />
          </span>
          <strong>Quotation</strong>
          <small>Share an estimate</small>
        </button>
      </section>

      <section className="metric-grid">
        <article>
          <div className="metric-icon ochre">
            <Clock3 />
          </div>
          <span>Unpaid</span>
          <strong>{isEmpty ? "0" : money(unpaid)}</strong>
          <small>
            {isEmpty
              ? "No unpaid documents"
              : `Across ${unpaidCount} document${unpaidCount === 1 ? "" : "s"}`}
          </small>
        </article>
        <article>
          <div className="metric-icon green">
            <Banknote />
          </div>
          <span>Paid this month</span>
          <strong>{isEmpty ? "0" : money(paidThisMonth)}</strong>
          <small>
            {isEmpty ? "No payments yet" : "Payments recorded locally"}
          </small>
        </article>
        <article>
          <div className="metric-icon soft">
            <FileCheck2 />
          </div>
          <span>Documents this month</span>
          <strong>{isEmpty ? "0" : String(docsThisMonth)}</strong>
          <small>{isEmpty ? "None yet" : "Created this month"}</small>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <h2>Recent documents</h2>
          <p>
            {isEmpty
              ? "Your documents will appear here"
              : "Pick up where you left off"}
          </p>
        </div>
        {!isEmpty && (
          <Link to="/documents">
            View all <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {isEmpty ? (
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
      ) : (
        <section className="document-list">
          {documents.slice(0, 4).map((doc) => (
            <button
              className="document-row"
              key={doc.id}
              onClick={() => navigate(`/editor/${doc.id}`)}
            >
              <div className="doc-thumb">
                <span>{doc.type.toUpperCase()}</span>
                <i />
                <i />
                <i />
              </div>
              <div className="doc-main">
                <strong>{doc.number || "Untitled"}</strong>
                <span>{doc.contact || "No client"}</span>
              </div>
              <span className="doc-date">
                {new Date(doc.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <strong className="doc-total">
                {money(grandTotal(doc), doc.currency)}
              </strong>
              <Badge tone={doc.status}>{doc.status}</Badge>
            </button>
          ))}
        </section>
      )}

      <aside className="backup-reminder">
        <div>
          <strong>Your work stays on this device</strong>
          <span>
            Make a backup to keep a portable copy of documents and images.
          </span>
        </div>
        <Button variant="secondary" onClick={() => navigate("/backup")}>
          Back up now
        </Button>
      </aside>
    </div>
  );
}
