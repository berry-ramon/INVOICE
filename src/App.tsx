import { RouterProvider } from "react-router";
import { WelcomeJourney } from "@/features/welcome/WelcomeJourney";
import { router } from "@/routes";
import { useAppStore } from "@/store/app";

export default function App() {
  const welcomeComplete = useAppStore((s) => s.welcomeComplete);
  const completeWelcome = useAppStore((s) => s.completeWelcome);

  return (
    <>
      <RouterProvider router={router} />
      {!welcomeComplete && <WelcomeJourney onDone={completeWelcome} />}
    </>
  );
}
