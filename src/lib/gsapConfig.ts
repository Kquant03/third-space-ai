"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined" && !gsap.core.globals()["ScrollTrigger"]) {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
