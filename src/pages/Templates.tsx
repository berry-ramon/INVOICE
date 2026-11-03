import { Copy, Plus } from "lucide-react";
import { Button, PageTitle } from "@/components/ui";
import { useAppStore } from "@/store/app";
import { useNavigate } from "react-router";

const templates = [
  {
    id: "ledger",
    name: "Ledger",
    description: "Clean and precise",
    color: "#0B6B57",
    style: "ledger",
  },
  {
    id: "coast",
    name: "Coast",
    description: "Warm and approachable",
    color: "#B7791F",
    style: "coast",
  },
  {
    id: "slate",
    name: "Slate",
    description: "Crisp and modern",
    color: "#475569",
    style: "slate",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Bold filled header",
    color: "#7A1F3D",
    style: "nuru",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet and spacious",
    color: "#2B2B2B",
    style: "minimal",
  },
  {
    id: "thermal",
    name: "Thermal",
    description: "For 80 mm receipts",
    color: "#0E7C86",
    style: "thermal",
  },
];

export function Templates() {
  const navigate = useNavigate();
  const { settings } = useAppStore();

  const use = (templateId: string, accent: string) => {
    navigate(
      `/?new=Invoice&template=${templateId}&accent=${encodeURIComponent(accent)}`,
    );
  };

  return (
    <div className="page">
      <PageTitle
        title="Templates"
        subtitle="Choose a starting point for every document"
      />
      <div className="tabs">
        <button className="active">
          Built-in <span>{templates.length}</span>
        </button>
        <button>
          My templates <span>0</span>
        </button>
      </div>
      <section className="template-grid">
        {templates.map((template) => (
          <article key={template.id}>
            <div className={`template-preview ${template.style}`}>
              <div style={{ background: template.color }} />
              <i />
              <i />
              <i />
              <section>
                <span />
                <span />
                <span />
              </section>
              <b />
            </div>
            <div className="template-meta">
              <span>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => use(template.id, template.color)}
            >
              <Copy /> Use template
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}
