import { Dashboard } from "@/components/Dashboard";
import { TaskProvider } from "@/lib/store";

export default function Home() {
  return (
    <TaskProvider>
      <Dashboard />
    </TaskProvider>
  );
}
