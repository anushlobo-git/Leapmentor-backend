const IS_PROD = process.env.NODE_ENV === "production";

const BASE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const setAuthCookies = (res, token, role) => {
  res.cookie("authToken", token, BASE_OPTIONS);
  if (role) {
    res.cookie("authRole", role, {
      ...BASE_OPTIONS,
      httpOnly: false, // frontend needs to read role for routing
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie("authToken", BASE_OPTIONS);
  res.clearCookie("authRole", { ...BASE_OPTIONS, httpOnly: false });
};

module.exports = { setAuthCookies, clearAuthCookies };
