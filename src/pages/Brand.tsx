import { Check, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Input, PageTitle, Sheet } from "@/components/ui";
import { ImageImporter } from "@/features/assets/ImageImporter";
import { useAppStore } from "@/store/app";
import type { Asset, BrandProfile } from "@/types/models";

const emptyProfile = (): BrandProfile => ({
  id: "",
  name: "",
  address: "",
  taxPin: "",
  paymentDetails: "",
  email: "",
  phone: "",
  accent: "#0B6B57",
});

export function Brand() {
  const {
    brandProfiles,
    assets,
    addBrandProfile,
    updateBrandProfile,
    addAsset,
    deleteAsset,
  } = useAppStore();

  const profile = brandProfiles[0];
  const [editing, setEditing] = useState<BrandProfile | null>(null);
  const [importerFor, setImporterFor] = useState<
    "logo" | "signature" | "seal" | null
  >(null);

  const openEdit = () => {
    setEditing(profile ? { ...profile } : emptyProfile());
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return;
    if (editing.id) {
      await updateBrandProfile(editing);
    } else {
      await addBrandProfile({ ...editing, id: crypto.randomUUID() });
    }
    setEditing(null);
  };

  const onAsset = async (asset: Asset) => {
    if (!profile) return;
    await addAsset(asset);
    const patch: Partial<BrandProfile> = {};
    if (importerFor === "logo") patch.logoAssetId = asset.id;
    if (importerFor === "signature") patch.signatureAssetId = asset.id;
    if (importerFor === "seal") patch.stampAssetId = asset.id;
    await updateBrandProfile({ ...profile, ...patch });
    setImporterFor(null);
  };

  const logo = assets.find((a) => a.id === profile?.logoAssetId);
  const signature = assets.find((a) => a.id === profile?.signatureAssetId);
  const seal = assets.find((a) => a.id === profile?.stampAssetId);

  if (!profile) {
    return (
      <div className="page">
        <PageTitle
          title="Brand & assets"
          subtitle="Your business identity, ready for every document"
        />
        <div className="empty-state">
          <div className="empty-icon">
            <span />
            <i />
          </div>
          <h2>No brand profile yet</h2>
          <p>Add your business details so they appear on every document.</p>
          <Button onClick={openEdit}>
            <Plus size={17} /> Create brand profile
          </Button>
        </div>
        <Sheet
          open={!!editing}
          title="Brand profile"
          onClose={() => setEditing(null)}
        >
          {editing && (
            <>
              <div className="form-grid">
                <label>
                  Business name
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Address
                  <Input
                    value={editing.address}
                    onChange={(e) =>
                      setEditing({ ...editing, address: e.target.value })
                    }
                  />
                </label>
                <label>
                  Email
                  <Input
                    value={editing.email}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Phone
                  <Input
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  Tax PIN
                  <Input
                    value={editing.taxPin}
                    onChange={(e) =>
                      setEditing({ ...editing, taxPin: e.target.value })
                    }
                  />
                </label>
                <label>
                  Payment details
                  <Input
                    value={editing.paymentDetails}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        paymentDetails: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Document accent colour
                  <Input
                    type="color"
                    value={editing.accent}
                    onChange={(e) =>
                      setEditing({ ...editing, accent: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-actions">
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={!editing.name.trim()}>
                  Save profile
                </Button>
              </div>
            </>
          )}
        </Sheet>
      </div>
    );
  }

  return (
    <div className="page">
      <PageTitle
        title="Brand & assets"
        subtitle="Your business identity, ready for every document"
        action={
          <Button onClick={openEdit}>
            <Plus /> Edit profile
          </Button>
        }
      />
      <section className="brand-layout">
        <article className="brand-profile">
          <div className="brand-profile-head">
            <div
              className="business-mark"
              style={{ background: profile.accent, color: "white" }}
            >
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{profile.name}</strong>
              <span>Default profile</span>
            </div>
            <span className="current-badge">
              <Check /> Active
            </span>
          </div>
          <dl>
            {profile.address && (
              <>
                <dt>Business address</dt>
                <dd>{profile.address}</dd>
              </>
            )}
            {profile.email && (
              <>
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </>
            )}
            {profile.phone && (
              <>
                <dt>Phone</dt>
                <dd>{profile.phone}</dd>
              </>
            )}
            {profile.taxPin && (
              <>
                <dt>Tax PIN</dt>
                <dd>{profile.taxPin}</dd>
              </>
            )}
            {profile.paymentDetails && (
              <>
                <dt>Payment details</dt>
                <dd>{profile.paymentDetails}</dd>
              </>
            )}
            <dt>Document accent</dt>
            <dd>
              <i
                className="brand-accent"
                style={{ background: profile.accent }}
              />{" "}
              {profile.accent}
            </dd>
          </dl>
          <Button variant="secondary" onClick={openEdit}>
            Edit brand profile
          </Button>
        </article>

        <section className="asset-panel">
          <h2>Assets</h2>
          <p>Logos, signatures and seals stored on this device.</p>
          <div className="asset-grid">
            <button onClick={() => setImporterFor("logo")}>
              <span>
                {logo ? (
                  <img
                    src={logo.dataUrl}
                    alt="Logo"
                    style={{
                      maxWidth: 56,
                      maxHeight: 40,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <ImageIcon />
                )}
              </span>
              <strong>Primary logo</strong>
              <small>{logo ? "Tap to replace" : "Add logo"}</small>
            </button>
            <button onClick={() => setImporterFor("signature")}>
              <span>
                {signature ? (
                  <img
                    src={signature.dataUrl}
                    alt="Signature"
                    style={{
                      maxWidth: 56,
                      maxHeight: 40,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span className="signature">Sign</span>
                )}
              </span>
              <strong>Signature</strong>
              <small>{signature ? "Tap to replace" : "Add signature"}</small>
            </button>
            <button onClick={() => setImporterFor("seal")}>
              <span>
                {seal ? (
                  <img
                    src={seal.dataUrl}
                    alt="Seal"
                    style={{
                      maxWidth: 56,
                      maxHeight: 40,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <ImageIcon />
                )}
              </span>
              <strong>Seal</strong>
              <small>{seal ? "Tap to replace" : "Add seal"}</small>
            </button>
            <button
              className="add-asset"
              onClick={() => setImporterFor("logo")}
            >
              <span>
                <Plus />
              </span>
              <strong>Add an asset</strong>
              <small>PNG, JPEG or SVG</small>
            </button>
          </div>
          {(logo || signature || seal) && (
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 12 }}>Remove an asset</strong>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {logo && (
                  <IconButton
                    label="Remove logo"
                    onClick={() => deleteAsset(logo.id)}
                  >
                    <Trash2 />
                  </IconButton>
                )}
                {signature && (
                  <IconButton
                    label="Remove signature"
                    onClick={() => deleteAsset(signature.id)}
                  >
                    <Trash2 />
                  </IconButton>
                )}
                {seal && (
                  <IconButton
                    label="Remove seal"
                    onClick={() => deleteAsset(seal.id)}
                  >
                    <Trash2 />
                  </IconButton>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      <Sheet
        open={!!editing}
        title="Brand profile"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <>
            <div className="form-grid">
              <label>
                Business name
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label>
                Address
                <Input
                  value={editing.address}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <Input
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </label>
              <label>
                Phone
                <Input
                  value={editing.phone}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Tax PIN
                <Input
                  value={editing.taxPin}
                  onChange={(e) =>
                    setEditing({ ...editing, taxPin: e.target.value })
                  }
                />
              </label>
              <label>
                Payment details
                <Input
                  value={editing.paymentDetails}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      paymentDetails: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Document accent colour
                <Input
                  type="color"
                  value={editing.accent}
                  onChange={(e) =>
                    setEditing({ ...editing, accent: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!editing.name.trim()}>
                Save profile
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <ImageImporter
        open={importerFor !== null}
        kind={importerFor === "seal" ? "stamp" : (importerFor ?? "logo")}
        onClose={() => setImporterFor(null)}
        onSave={onAsset}
      />
    </div>
  );
}
