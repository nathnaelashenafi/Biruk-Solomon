import Hero from "./components/Hero";
import SelectedWork from "./components/work/SelectedWork";
import Services from "./components/Services";
import About from "./components/About";
import GradingSection from "./components/GradingSection.jsx";

export default function App() {
  return (
    <>
      <Hero />
      <SelectedWork />
      <Services />
      <GradingSection />
      <About />
    </>
  );
}
