import { Box, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Input, PageTitle, Sheet } from "@/components/ui";
import { money } from "@/lib/data";
import { useAppStore } from "@/store/app";
import type { LibraryItem } from "@/types/models";

export function Items() {
  const { items, addItem, deleteItem, settings } = useAppStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LibraryItem>({
    id: "",
    name: "",
    description: "",
    unit: "service",
    rate: 0,
    taxRate: undefined,
    category: "",
  });

  const visible = items.filter((item) =>
    `${item.name} ${item.description} ${item.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const save = async () => {
    if (!form.name.trim()) return;
    await addItem({
      ...form,
      id: crypto.randomUUID(),
      taxRate: settings.defaultTaxRate ?? form.taxRate,
    });
    setForm({
      id: "",
      name: "",
      description: "",
      unit: "service",
      rate: 0,
      taxRate: undefined,
      category: "",
    });
    setOpen(false);
  };

  return (
    <div className="page">
      <PageTitle
        title="Items library"
        subtitle="Reusable products and services for faster documents"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add item
          </Button>
        }
      />

      {items.length > 0 && (
        <label className="search-input contacts-search">
          <Search size={18} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
          />
        </label>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <span />
            <i />
          </div>
          <h2>No items yet</h2>
          <p>Add products or services you bill often to speed up invoicing.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} /> Add your first item
          </Button>
        </div>
      ) : (
        <section className="library-table">
          <div className="library-head">
            <span>Item</span>
            <span>Category</span>
            <span>Unit</span>
            <span>Tax</span>
            <span>Rate</span>
            <span />
          </div>
          {visible.map((item) => (
            <div className="library-row" key={item.id}>
              <span className="item-symbol">
                <Box />
              </span>
              <span>
                <strong>{item.name}</strong>
                {item.description && <small>{item.description}</small>}
              </span>
              <span>{item.category || "-"}</span>
              <span>{item.unit}</span>
              <span>{item.taxRate ? `${item.taxRate}%` : "-"}</span>
              <strong>{money(item.rate, settings.currency)}</strong>
              <IconButton
                label="Delete item"
                onClick={() => {
                  if (confirm(`Delete ${item.name}?`)) deleteItem(item.id);
                }}
              >
                <Trash2 />
              </IconButton>
            </div>
          ))}
        </section>
      )}

      <Sheet open={open} title="Add item" onClose={() => setOpen(false)}>
        <div className="form-grid">
          <label>
            Name
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Design consultation"
            />
          </label>
          <label>
            Description
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional"
            />
          </label>
          <label>
            Category
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Design"
            />
          </label>
          <label>
            Unit
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="service, project, hour…"
            />
          </label>
          <label>
            Rate
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.rate}
              onChange={(e) =>
                setForm({ ...form, rate: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Tax rate %
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.taxRate ?? settings.defaultTaxRate ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  taxRate: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!form.name.trim()}>
            <Plus size={16} /> Save item
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
