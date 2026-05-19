import type { MemberRecord, TeamRecord, RoleRecord, PermissionRecord } from "../db.js";
import * as db from "../db.js";

export { getMembers, getMemberByEmail, toggleMember, updateMemberRole } from "../db.js";
export { getTeams, toggleTeam } from "../db.js";
export { getRoles, getPermissions, toggleRole, toggleRolePermission } from "../db.js";

export async function getIdentityOverview() {
  const [members, teams, roles, permissions] = await Promise.all([
    db.getMembers(),
    db.getTeams(),
    db.getRoles(),
    db.getPermissions()
  ]);

  return {
    members: {
      total: members.length,
      active: members.filter((m) => m.status === "active").length,
      items: members
    },
    teams: {
      total: teams.length,
      items: teams
    },
    roles: {
      total: roles.length,
      enabled: roles.filter((r) => r.status === "enabled").length,
      items: roles
    },
    permissions
  };
}