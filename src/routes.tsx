import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Backup } from "@/pages/Backup";
import { Brand } from "@/pages/Brand";
import { Contacts } from "@/pages/Contacts";
import { Documents } from "@/pages/Documents";
import { Editor } from "@/pages/Editor";
import { Home } from "@/pages/Home";
import { Items } from "@/pages/Items";
import { NotFound } from "@/pages/NotFound";
import { Settings } from "@/pages/Settings";
import { Templates } from "@/pages/Templates";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: Home },
      { path: "documents", Component: Documents },
      { path: "contacts", Component: Contacts },
      { path: "items", Component: Items },
      { path: "templates", Component: Templates },
      { path: "brand", Component: Brand },
      { path: "settings", Component: Settings },
      { path: "backup", Component: Backup },
      { path: "editor/:id", Component: Editor },
      { path: "*", Component: NotFound },
    ],
  },
]);
