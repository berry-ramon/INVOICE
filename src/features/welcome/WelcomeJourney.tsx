import { useState } from "react";
import { Button } from "@/components/ui";
import { FilePlus2, Palette, Download, WifiOff, X } from "lucide-react";

interface Props {
  onDone: () => void;
}

const steps = [
  {
    icon: FilePlus2,
    title: "Create any document",
    body: "Invoices, receipts, quotations and vouchers - all from one place. Start empty and build it your way.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Add your logo, signature and stamp. Pick an accent colour. Everything lives on your device.",
  },
  {
    icon: Download,
    title: "Export a perfect PDF",
    body: "Portrait or landscape, A4 or letter - with your branding, no watermarks, no accounts.",
  },
  {
    icon: WifiOff,
    title: "Works fully offline",
    body: "Once installed, Hatiri runs without a network. Your data never leaves your device.",
  },
];

export function WelcomeJourney({ onDone }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const Icon = step.icon;
  const last = index === steps.length - 1;

  return (
    <div className="welcome-layer">
      <div className="welcome-card">
        <button
          className="welcome-skip"
          onClick={onDone}
          aria-label="Skip tour"
        >
          <X size={18} />
          <span>Skip</span>
        </button>
        <div className="welcome-icon">
          <Icon size={28} />
        </div>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="welcome-dots">
          {steps.map((_, i) => (
            <span key={i} className={i === index ? "active" : ""} />
          ))}
        </div>
        <div className="welcome-actions">
          <Button
            variant="ghost"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            Back
          </Button>
          <Button onClick={() => (last ? onDone() : setIndex((i) => i + 1))}>
            {last ? "Get started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
