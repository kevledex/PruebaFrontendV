import type { ReactNode } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import "./MainLayout.css";

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <Navbar />

      <main className="main-layout-content">
        {children}
      </main>

      <Footer />
    </div>
  );
}

export default MainLayout;