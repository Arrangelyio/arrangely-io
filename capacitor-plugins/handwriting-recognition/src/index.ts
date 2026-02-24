import { registerPlugin } from "@capacitor/core";
import type { HandwritingRecognitionPlugin } from "./definitions";

const HandwritingRecognition = registerPlugin<HandwritingRecognitionPlugin>(
  "HandwritingRecognition",
  {
    web: () => import("./web").then((m) => new m.HandwritingRecognitionWeb()),
  }
);

export * from "./definitions";
export { HandwritingRecognition };
