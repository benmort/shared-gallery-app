import { permanentRedirect } from "next/navigation";

export default function AlbumRedirectPage() {
  permanentRedirect("/moments");
}
