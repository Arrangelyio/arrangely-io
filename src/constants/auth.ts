import { Guitar, Piano, Mic, Drum, Music } from "lucide-react";
import { Instrument } from "@/types/auth";

export const instruments: Instrument[] = [
  { id: "piano", name: "Piano/Keyboard", icon: Piano },
  { id: "guitar", name: "Guitar", icon: Guitar },
  { id: "vocals", name: "Vocals", icon: Mic },
  { id: "drums", name: "Drums", icon: Drum },
  { id: "bass", name: "Bass Guitar", icon: Music },
  { id: "violin", name: "Violin", icon: Music },
  { id: "saxophone", name: "Saxophone", icon: Music },
  { id: "trumpet", name: "Trumpet", icon: Music },
];

export const roles = [
  "Keyboardist/Pianist",
  "Music Director", 
  "Worship Leader",
  "Musician",
  "Singer",
  "Sound Engineer",
  "Music Teacher",
  "Composer/Arranger",
  "Music Student"
];

export const hearAboutUsOptions = [
  "Social Media (Facebook, Instagram, etc.)",
  "YouTube",
  "Google Search",
  "Friend/Word of Mouth",
  "Church/Ministry",
  "Music Community/Forum",
  "Advertisement",
  "Other"
];

export const experienceLevels = [
  "Beginner (0-2 years)",
  "Intermediate (2-5 years)", 
  "Advanced (5-10 years)",
  "Professional (10+ years)"
];