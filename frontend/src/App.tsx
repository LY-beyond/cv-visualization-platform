import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ChapterPage from "./components/ChapterPage";
import HomePage from "./components/HomePage";
import Layout from "./components/Layout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chapters/:chapterId" element={<ChapterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
