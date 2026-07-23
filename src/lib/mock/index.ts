// Barrel for the local mock knowledge dataset. Import from "@/lib/mock".
//
// Everything exported here is LOCAL DEMO DATA for development only — see the file headers
// in ./sources.ts, ./courseDates.ts, ./departments.ts, and ./comparisons.ts.

export {
  type DepartmentId,
  DEPARTMENT_IDS,
  departments,
  getDepartment,
  isDepartmentId,
} from "./departments";

export {
  MOCK_DATA_DISCLAIMER,
  COURSE_DATE_SOURCE_TITLE,
  sources,
  sourceById,
  sourceTitles,
  getSourceById,
} from "./sources";

export { courseDates } from "./courseDates";

export {
  type ComparisonRecord,
  comparisons,
  findComparison,
} from "./comparisons";
