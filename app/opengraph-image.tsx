import { loomImage } from "./loom-image";

export const alt = "CodeLoom, a cloud coding agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return loomImage(1200, 630, true);
}
