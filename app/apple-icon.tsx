import { loomImage } from "./loom-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return loomImage(180, 180, false);
}
