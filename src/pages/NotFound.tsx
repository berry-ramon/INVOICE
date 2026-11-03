import { Link } from "react-router";
import { Logo } from "@/components/Logo";

export function NotFound() {
  return (
    <main className="not-found">
      <Logo />
      <strong>404</strong>
      <h1>This page is not in the ledger.</h1>
      <p>The link may be old, but your documents are safe.</p>
      <Link to="/">Go home</Link>
    </main>
  );
}
