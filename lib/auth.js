import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "palak@2004";

export function createToken(payload) {
  const data = {
    id: payload._id || payload.id,
    email: payload.email || payload.riderId || "",
    riderId: payload.riderId || undefined,
    name: payload.name || undefined,
    role: payload.role || "admin",
  };

  const token = jwt.sign(data, JWT_SECRET, { expiresIn: "7d" });
  return token;
}

export function checkToken(token) {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}
