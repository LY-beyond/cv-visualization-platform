import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ChapterPage from "./components/ChapterPage";
import HomePage from "./components/HomePage";
import Layout from "./components/Layout";
import GraphView from "./pages/GraphView";
import LearningPathPage from "./pages/LearningPathPage";
import LabsPage from "./pages/LabsPage";
import LabDetailPage from "./pages/LabDetailPage";

export default function App() {
  // 生产构建部署在 /app 下，路由需要同步 basename
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/path" element={<LearningPathPage />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/labs/:labId" element={<LabDetailPage />} />
          <Route path="/chapters/:chapterId" element={<ChapterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
