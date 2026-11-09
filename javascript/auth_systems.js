const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class RBAC {
  constructor() {
    this.users = new Map();
    this.roles = new Map();
    this.permissions = new Map();
    this.roleHierarchy = new Map();
  }
  createUser(userId, roles) {
    this.users.set(userId, new Set(roles || []));
  }
  createRole(roleId, permissions) {
    this.roles.set(roleId, new Set(permissions || []));
  }
  assignRole(userId, roleId) {
    if (!this.users.has(userId)) throw new Error("user not found");
    this.users.get(userId).add(roleId);
  }
  revokeRole(userId, roleId) {
    if (!this.users.has(userId)) throw new Error("user not found");
    this.users.get(userId).delete(roleId);
  }
  addPermission(roleId, permission) {
    if (!this.roles.has(roleId)) throw new Error("role not found");
    this.roles.get(roleId).add(permission);
  }
  setParentRole(child, parent) {
    this.roleHierarchy.set(child, parent);
  }
  getEffectiveRoles(roleId, visited) {
    if (!visited) visited = new Set();
    if (visited.has(roleId)) return new Set();
    visited.add(roleId);
    const roles = new Set([roleId]);
    const parent = this.roleHierarchy.get(roleId);
    if (parent) {
      for (const r of this.getEffectiveRoles(parent, visited)) roles.add(r);
    }
    return roles;
  }
  getUserPermissions(userId) {
    const userRoles = this.users.get(userId);
    if (!userRoles) return new Set();
    const perms = new Set();
    for (const roleId of userRoles) {
      for (const effectiveRole of this.getEffectiveRoles(roleId)) {
        const rolePerms = this.roles.get(effectiveRole);
        if (rolePerms) for (const p of rolePerms) perms.add(p);
      }
    }
    return perms;
  }
  hasPermission(userId, permission) {
    return this.getUserPermissions(userId).has(permission);
  }
}

class ACL {
  constructor() {
    this.entries = new Map();
  }
  grant(resource, principal, permissions) {
    const key = resource + ":" + principal;
    if (!this.entries.has(key)) this.entries.set(key, new Set());
    for (const p of permissions) this.entries.get(key).add(p);
  }
  deny(resource, principal, permissions) {
    const key = resource + ":" + principal;
    if (!this.entries.has(key)) this.entries.set(key, new Set());
    for (const p of permissions) this.entries.get(key).delete(p);
  }
  check(resource, principal, permission) {
    const key = resource + ":" + principal;
    const perms = this.entries.get(key);
    return perms ? perms.has(permission) : false;
  }
  getResourceACL(resource) {
    const acl = {};
    for (const [key, perms] of this.entries) {
      if (key.startsWith(resource + ":")) {
        const principal = key.slice(resource.length + 1);
        acl[principal] = [...perms].sort();
      }
    }
    return acl;
  }
  removePrincipal(principal) {
    for (const [key] of this.entries) {
      if (key.endsWith(":" + principal)) this.entries.delete(key);
    }
  }
}

class PolicyEngine {
  constructor() {
    this.policies = [];
  }
  addPolicy(policy) {
    this.policies.push(policy);
  }
  evaluate(context) {
    for (const policy of this.policies) {
      if (policy.condition(context)) return policy.effect;
    }
    return "deny";
  }
  evaluateAll(context) {
    const results = [];
    for (const policy of this.policies) {
      if (policy.condition(context)) results.push({ name: policy.name, effect: policy.effect });
    }
    return results;
  }
}

check("rbac basic permission", (() => {
  const rbac = new RBAC();
  rbac.createRole("admin", ["read", "write", "delete"]);
  rbac.createUser("alice", ["admin"]);
  return rbac.hasPermission("alice", "write");
})(), true);
check("rbac no permission", (() => {
  const rbac = new RBAC();
  rbac.createRole("viewer", ["read"]);
  rbac.createUser("bob", ["viewer"]);
  return rbac.hasPermission("bob", "delete");
})(), false);
check("rbac role hierarchy", (() => {
  const rbac = new RBAC();
  rbac.createRole("base", ["read"]);
  rbac.createRole("editor", ["write"]);
  rbac.setParentRole("editor", "base");
  rbac.createUser("carol", ["editor"]);
  return rbac.hasPermission("carol", "read") && rbac.hasPermission("carol", "write");
})(), true);
check("rbac unknown user no perms", (() => {
  const rbac = new RBAC();
  return rbac.getUserPermissions("ghost").size;
})(), 0);
check("rbac assign role", (() => {
  const rbac = new RBAC();
  rbac.createRole("r1", ["p1"]);
  rbac.createUser("u1", []);
  rbac.assignRole("u1", "r1");
  return rbac.hasPermission("u1", "p1");
})(), true);
check("rbac revoke role", (() => {
  const rbac = new RBAC();
  rbac.createRole("r1", ["p1"]);
  rbac.createUser("u1", ["r1"]);
  rbac.revokeRole("u1", "r1");
  return rbac.hasPermission("u1", "p1");
})(), false);
check("acl grant and check", (() => {
  const acl = new ACL();
  acl.grant("/api/data", "user1", ["read", "write"]);
  return acl.check("/api/data", "user1", "read");
})(), true);
check("acl deny removes permission", (() => {
  const acl = new ACL();
  acl.grant("/file", "u1", ["read", "write"]);
  acl.deny("/file", "u1", ["write"]);
  return acl.check("/file", "u1", "write");
})(), false);
check("acl unknown returns false", new ACL().check("/x", "y", "z"), false);
check("acl get resource acl", (() => {
  const acl = new ACL();
  acl.grant("/doc", "alice", ["read"]);
  acl.grant("/doc", "bob", ["read", "write"]);
  return Object.keys(acl.getResourceACL("/doc")).sort();
})(), ["alice", "bob"]);
check("policy engine allow", (() => {
  const pe = new PolicyEngine();
  pe.addPolicy({ name: "admin", condition: ctx => ctx.role === "admin", effect: "allow" });
  return pe.evaluate({ role: "admin" });
})(), "allow");
check("policy engine default deny", (() => {
  const pe = new PolicyEngine();
  pe.addPolicy({ name: "admin", condition: ctx => ctx.role === "admin", effect: "allow" });
  return pe.evaluate({ role: "guest" });
})(), "deny");
check("policy engine evaluate all", (() => {
  const pe = new PolicyEngine();
  pe.addPolicy({ name: "p1", condition: () => true, effect: "allow" });
  pe.addPolicy({ name: "p2", condition: () => true, effect: "log" });
  return pe.evaluateAll({}).length;
})(), 2);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
