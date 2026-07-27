import { permanentRedirect } from "next/navigation";

// The directory has no unnumbered form; page 1 is the canonical entry.
export default function AgentDirectoryIndex() {
  permanentRedirect("/property-agents/directory/1");
}
