const WORKS_API_BASE = "https://www.worksapis.com/v1.0";

interface NaverWorksOrgUnitEntry {
  orgUnitId: string;
  orgUnitName: string;
  primary: boolean;
}

interface NaverWorksOrganization {
  domainId: number;
  primary: boolean;
  levelName?: string;
  positionName?: string;
  orgUnits?: NaverWorksOrgUnitEntry[];
}

interface NaverWorksUser {
  userId: string;
  userName: {
    lastName: string;
    firstName: string;
  };
  email: string;
  organizations?: NaverWorksOrganization[];
  employeeNumber?: string;
  photoUrl?: string;
  cellPhone?: string;
  employmentTypeId?: string;
}

interface NaverWorksOrgUnit {
  domainId: number;
  orgUnitId: string;
  orgUnitName: string;
  description?: string;
  parentOrgUnitId?: string;
  displayOrder?: number;
}

interface ListUsersResponse {
  users: NaverWorksUser[];
  responseMetaData?: {
    nextCursor?: string;
  };
}

interface ListOrgUnitsResponse {
  orgUnits: NaverWorksOrgUnit[];
  responseMetaData?: {
    nextCursor?: string;
  };
}

async function worksApiFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${WORKS_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Naver Works API error (${res.status}): ${error}`);
  }

  return res.json();
}

// 전체 구성원 목록 조회 (페이징 처리)
export async function fetchAllMembers(accessToken: string): Promise<NaverWorksUser[]> {
  const domainId = process.env.NAVER_WORKS_DOMAIN_ID!;
  const allUsers: NaverWorksUser[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ domainId });
    if (cursor) params.set("cursor", cursor);

    const data = await worksApiFetch<ListUsersResponse>(
      `/users?${params.toString()}`,
      accessToken
    );

    allUsers.push(...(data.users || []));
    cursor = data.responseMetaData?.nextCursor;
  } while (cursor);

  return allUsers;
}

// 전체 조직(부서) 목록 조회 (페이징 처리)
export async function fetchAllOrgUnits(accessToken: string): Promise<NaverWorksOrgUnit[]> {
  const domainId = process.env.NAVER_WORKS_DOMAIN_ID!;
  const allOrgUnits: NaverWorksOrgUnit[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ domainId });
    if (cursor) params.set("cursor", cursor);

    const data = await worksApiFetch<ListOrgUnitsResponse>(
      `/orgunits?${params.toString()}`,
      accessToken
    );

    allOrgUnits.push(...(data.orgUnits || []));
    cursor = data.responseMetaData?.nextCursor;
  } while (cursor);

  return allOrgUnits;
}

// 사용자 정보를 DB 형식으로 변환
export function toUserRecord(user: NaverWorksUser) {
  const primaryOrg = user.organizations?.find((o) => o.primary) || user.organizations?.[0];
  const primaryOrgUnit = primaryOrg?.orgUnits?.find((u) => u.primary) || primaryOrg?.orgUnits?.[0];

  return {
    naver_works_id: user.userId,
    employee_number: user.employeeNumber || null,
    email: user.email,
    name: `${user.userName.lastName}${user.userName.firstName}`,
    department: primaryOrgUnit?.orgUnitName || null,
    department_id: primaryOrgUnit?.orgUnitId || null,
    position: primaryOrg?.levelName || null,
    avatar_url: user.photoUrl || null,
  };
}

// 조직 정보를 DB 형식으로 변환
export function toOrgUnitRecord(orgUnit: NaverWorksOrgUnit) {
  return {
    naver_works_org_id: orgUnit.orgUnitId,
    name: orgUnit.orgUnitName,
    description: orgUnit.description || null,
    parent_org_id: orgUnit.parentOrgUnitId || null,
    display_order: orgUnit.displayOrder || 0,
  };
}
