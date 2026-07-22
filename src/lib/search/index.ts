// Barrel for the website search layer. Import from "@/lib/search".
//
// The search layer is intentionally decoupled from any concrete backend: the UI uses
// `searchService`, which wraps a `SearchProvider`. The local provider reads mock data; a
// future Bedrock Knowledge Base provider satisfies the same seam (docs/INTEGRATIONS.md).

export { createLocalSearchProvider } from "./localSearchProvider";
export {
  type SearchService,
  createSearchService,
  searchService,
} from "./searchService";
