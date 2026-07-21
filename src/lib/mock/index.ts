// Barrel for the local mock knowledge dataset. Import from "@/lib/mock".
//
// Everything exported here is LOCAL DEMO DATA for development only — see the file headers
// in ./sources.ts, ./courseDates.ts, and ./departments.ts.

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
