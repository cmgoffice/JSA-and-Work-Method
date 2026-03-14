import type { UserRole } from "../types/auth";

/** โมดูลในระบบ */
export const MODULES = ["projects", "wms", "jsa", "users"] as const;
export type ModuleId = (typeof MODULES)[number];

/** action ที่สามารถทำได้ */
export type Action = "view" | "create" | "edit" | "delete";

/** สิทธิ์เข้าถึงโมดูลของแต่ละ Role */
export const ROLE_MODULES: Record<UserRole, ModuleId[]> = {
  SuperAdmin: ["projects", "wms", "jsa", "users"],
  Admin:      ["projects", "wms", "jsa", "users"],
  Manager:    ["projects", "wms", "jsa"],
  Staff:      ["projects", "wms", "jsa"],
  Viewer:     ["projects", "wms", "jsa"],
};

/**
 * สิทธิ์ action ของแต่ละ Role
 * SuperAdmin / Admin  → ทำได้ทุกอย่าง
 * Manager             → ดู, สร้าง, แก้ไข, ลบ  (ไม่มีสิทธิ์จัดการ Users)
 * Staff               → ดู, สร้าง, แก้ไข       (ลบไม่ได้)
 * Viewer              → ดูอย่างเดียว
 */
export const ROLE_ACTIONS: Record<UserRole, Action[]> = {
  SuperAdmin: ["view", "create", "edit", "delete"],
  Admin:      ["view", "create", "edit", "delete"],
  Manager:    ["view", "create", "edit", "delete"],
  Staff:      ["view", "create", "edit"],
  Viewer:     ["view"],
};

/** คำนวณโมดูลที่เข้าถึงได้ (รวมหลาย role) */
export function getAccessibleModules(roles: UserRole[]): Set<ModuleId> {
  const set = new Set<ModuleId>();
  for (const role of roles) {
    ROLE_MODULES[role]?.forEach((m) => set.add(m));
  }
  return set;
}

/** คำนวณ actions ที่ทำได้ (รวมหลาย role) */
export function getAccessibleActions(roles: UserRole[]): Set<Action> {
  const set = new Set<Action>();
  for (const role of roles) {
    ROLE_ACTIONS[role]?.forEach((a) => set.add(a));
  }
  return set;
}

export function canAccessModule(roles: UserRole[] | undefined, moduleId: ModuleId): boolean {
  if (!roles?.length) return false;
  return getAccessibleModules(roles).has(moduleId);
}
