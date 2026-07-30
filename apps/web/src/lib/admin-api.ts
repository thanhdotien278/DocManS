import { getApiBaseUrl } from "@/lib/session";

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  status: string;
  systemRole: string | null;
  unit: string;
  organizationUnitId?: string;
};

export type AdminRole = {
  id: string;
  code: string;
  label: string;
  status: string;
};

export type OrganizationUnit = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type CatalogItem = {
  id: string;
  type: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
};

export type SystemParameter = {
  id: string;
  key: string;
  value: string;
  label: string;
};

export type NotificationTemplate = {
  id: string;
  key: string;
  subject: string;
  body: string;
  status: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(body) ?? "Không thể xử lý yêu cầu. Vui lòng kiểm tra quyền truy cập hoặc thử lại.");
  }

  return (await response.json()) as T;
}

function readApiErrorMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const message = (body as { message?: unknown }).message;
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(" ");
  }

  return null;
}

export type UserFilterInput = {
  keyword?: string;
  search?: string;
  systemRole?: string;
  organizationId?: string;
  organization?: string;
  status?: string;
};

function userFilterQuery(filters?: UserFilterInput) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function loadAdminAccessData(filters?: UserFilterInput) {
  const [users, roles, organizationUnits] = await Promise.all([
    requestJson<{ users: AdminUser[]; total?: number }>(`/users${userFilterQuery(filters)}`),
    requestJson<{ roles: AdminRole[] }>("/roles"),
    requestJson<{ organizationUnits: OrganizationUnit[] }>("/organization-units")
  ]);

  return {
    users: users.users,
    total: users.total ?? users.users.length,
    roles: roles.roles,
    organizationUnits: organizationUnits.organizationUnits
  };
}

export async function createAdminUser(input: {
  username: string;
  displayName: string;
  password: string;
  systemRole: string;
  organizationUnitId: string;
}) {
  return requestJson<{ user: AdminUser }>("/users", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateAdminUserStatus(userId: string, status: string) {
  return requestJson<{ user: AdminUser }>(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function updateAdminUser(
  userId: string,
  input: {
    displayName: string;
    systemRole: string;
    organizationUnitId: string;
  }
) {
  return requestJson<{ user: AdminUser }>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function initiateAdminPasswordReset(userId: string) {
  return requestJson<{ token: string; expiresAt: string }>(`/users/${userId}/password-reset`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function loadCatalogItems(type?: string) {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const response = await requestJson<{ items: CatalogItem[] }>(`/catalogs${query}`);
  return response.items;
}

export async function createCatalogItem(input: {
  type: string;
  code: string;
  name: string;
  description?: string;
}) {
  return requestJson<{ item: CatalogItem }>("/catalogs", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCatalogItem(
  itemId: string,
  input: {
    name?: string;
    description?: string;
    status?: string;
  }
) {
  return requestJson<{ item: CatalogItem }>(`/catalogs/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function softDeleteCatalogItem(itemId: string) {
  return requestJson<{ item: CatalogItem }>(`/catalogs/${itemId}`, {
    method: "DELETE"
  });
}

export async function loadAdminConfig() {
  const [parameters, templates] = await Promise.all([
    requestJson<{ parameters: SystemParameter[] }>("/config/system-parameters"),
    requestJson<{ templates: NotificationTemplate[] }>("/config/notification-templates")
  ]);

  return {
    parameters: parameters.parameters,
    templates: templates.templates
  };
}

export async function updateSystemParameter(input: { key: string; value: string; label: string }) {
  return requestJson<{ parameter: SystemParameter }>("/config/system-parameters", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function updateNotificationTemplate(input: { key: string; subject: string; body: string }) {
  return requestJson<{ template: NotificationTemplate }>("/config/notification-templates", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function createOrganizationUnit(input: { code: string; name: string }) {
  return requestJson<{ organizationUnit: OrganizationUnit }>("/organization-units", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateOrganizationUnitStatus(unitId: string, status: string) {
  return requestJson<{ organizationUnit: OrganizationUnit }>(`/organization-units/${unitId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}
