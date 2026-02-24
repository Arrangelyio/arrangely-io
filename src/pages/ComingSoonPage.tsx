import { useLocation } from "react-router-dom";
import ComingSoon from "@/components/ComingSoon";

const ComingSoonPage = () => {
  const location = useLocation();
  const state = location.state as { title?: string; description?: string } | null;

  return (
    <ComingSoon
      title={state?.title || "Coming Soon"}
      description={state?.description || "This feature is currently under development and will be available soon."}
      expectedDate="Q2 2025"
    />
  );
};

export default ComingSoonPage;