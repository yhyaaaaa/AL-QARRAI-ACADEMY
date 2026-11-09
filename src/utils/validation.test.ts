import { validatePassword, validateRegistration } from "./validation";

describe("registration validation", () => {
  const ok = {
    name: "Amal",
    email: "amal@example.com",
    password: "Secret1234x",
    confirm: "Secret1234x",
  };

  it("accepts a valid adult and a minor with guardian consent", () => {
    expect(validateRegistration({ ...ok, ageBand: "18_plus", consent: false })).toEqual({});
    expect(
      validateRegistration({
        ...ok,
        ageBand: "under_13",
        consent: true,
        guardianEmail: "mum@x.org",
      }),
    ).toEqual({});
    expect(
      validateRegistration({ ...ok, accountType: "parent", ageBand: "", consent: false }),
    ).toEqual({});
  });

  it("requires guardian consent and a distinct guardian email for minors", () => {
    expect(validateRegistration({ ...ok, ageBand: "13_15", consent: false }).consent).toBeDefined();
    expect(
      validateRegistration({ ...ok, ageBand: "13_15", consent: true }).guardianEmail,
    ).toBeDefined();
    expect(
      validateRegistration({ ...ok, ageBand: "13_15", consent: true, guardianEmail: ok.email })
        .guardianEmail,
    ).toMatch(/different/);
  });

  it("enforces the same password policy as the server", () => {
    expect(validatePassword("short1A")).toMatch(/10/);
    expect(validatePassword("alllowercase123")).toMatch(/upper/);
    expect(validatePassword("GoodPassword1")).toBeNull();
  });

  it("rejects personal data in nicknames", () => {
    expect(
      validateRegistration({ ...ok, name: "amal@mail.com", ageBand: "18_plus", consent: false })
        .name,
    ).toBeDefined();
    expect(
      validateRegistration({ ...ok, name: "Amal 0612345678", ageBand: "18_plus", consent: false })
        .name,
    ).toBeDefined();
  });
});
