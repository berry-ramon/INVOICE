import { Mail, MapPin, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Input, PageTitle, Sheet } from "@/components/ui";
import { initials, money, grandTotal } from "@/lib/data";
import { useAppStore } from "@/store/app";
import type { Contact } from "@/types/models";

export function Contacts() {
  const { contacts, documents, addContact, deleteContact } = useAppStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Contact>({
    id: "",
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
  });

  const visible = contacts.filter((c) =>
    `${c.company} ${c.name} ${c.email}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const save = async () => {
    if (!form.company.trim()) return;
    await addContact({ ...form, id: crypto.randomUUID() });
    setForm({
      id: "",
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
    });
    setOpen(false);
  };

  return (
    <div className="page">
      <PageTitle
        title="Contacts"
        subtitle="Clients and businesses you work with"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> Add contact
          </Button>
        }
      />

      {contacts.length > 0 && (
        <label className="search-input contacts-search">
          <Search size={18} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts"
          />
        </label>
      )}

      {contacts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <span />
            <i />
          </div>
          <h2>No contacts yet</h2>
          <p>Add clients so you can invoice them faster.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} /> Add your first contact
          </Button>
        </div>
      ) : (
        <section className="contact-grid">
          {visible.map((contact) => {
            const related = documents.filter(
              (d) =>
                d.contactId === contact.id ||
                (d.contact && d.contact === contact.company),
            );
            return (
              <article className="contact-card" key={contact.id}>
                <div className="avatar">{initials(contact.company)}</div>
                <div className="contact-title">
                  <strong>{contact.company}</strong>
                  {contact.name && <span>{contact.name}</span>}
                </div>
                <IconButton
                  label="Delete contact"
                  onClick={() => {
                    if (confirm(`Delete ${contact.company}?`)) {
                      deleteContact(contact.id);
                    }
                  }}
                >
                  <Trash2 />
                </IconButton>
                <div className="contact-details">
                  {contact.email && (
                    <span>
                      <Mail />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span>
                      <Phone />
                      {contact.phone}
                    </span>
                  )}
                  {contact.address && (
                    <span>
                      <MapPin />
                      {contact.address}
                    </span>
                  )}
                </div>
                <div className="contact-stats">
                  <span>
                    <small>Documents</small>
                    <strong>{related.length}</strong>
                  </span>
                  <span>
                    <small>Total billed</small>
                    <strong>
                      {money(
                        related.reduce((sum, d) => sum + grandTotal(d), 0),
                      )}
                    </strong>
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <Sheet open={open} title="Add contact" onClose={() => setOpen(false)}>
        <div className="form-grid">
          <label>
            Company
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="e.g. Acme Ltd"
            />
          </label>
          <label>
            Contact name
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
          </label>
          <label>
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@company.com"
            />
          </label>
          <label>
            Phone
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+254 …"
            />
          </label>
          <label>
            Address
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, city"
            />
          </label>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            <X size={16} /> Cancel
          </Button>
          <Button onClick={save} disabled={!form.company.trim()}>
            <Plus size={16} /> Save contact
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
