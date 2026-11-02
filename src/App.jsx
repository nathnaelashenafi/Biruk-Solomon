import { useSyncExternalStore } from "react";
import Hero from "./components/Hero";
import SelectedWork from "./components/work/SelectedWork";
import Services from "./components/Services";
import GradingSection from "./components/GradingSection.jsx";
import About from "./components/About";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import TestimonialSubmit from "./components/TestimonialSubmit";

// Private invitation page lives at  #/testimonial?token=...  (no router package needed).
const onSubmitRoute = () => window.location.hash.startsWith("#/testimonial");
const subscribe = (cb) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export default function App() {
  const isSubmitPage = useSyncExternalStore(
    subscribe,
    onSubmitRoute,
    () => false,
  );
  if (isSubmitPage) return <TestimonialSubmit />;

  return (
    <>
      <Hero />
      <SelectedWork />
      <Services />
      <GradingSection />
      <About />
      <Testimonials />
      <Contact />
      <Footer />
    </>
  );
}
