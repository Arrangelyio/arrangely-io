import { createContext, useContext } from "react";

interface CreatorDashboardContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
}

export const CreatorDashboardContext = createContext<CreatorDashboardContextValue | undefined>(undefined);

export function useCreatorDashboard() {
  const ctx = useContext(CreatorDashboardContext);
  if (!ctx) {
    throw new Error("useCreatorDashboard must be used within CreatorDashboardProvider");
  }
  return ctx;
}

interface ProviderProps {
  value: CreatorDashboardContextValue;
  children: React.ReactNode;
}

export function CreatorDashboardProvider({ value, children }: ProviderProps) {
  return (
    <CreatorDashboardContext.Provider value={value}>
      {children}
    </CreatorDashboardContext.Provider>
  );
}
