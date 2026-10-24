import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Jämförs mot när e-postadressen inte finns, så att svarstiden inte avslöjar
// vilka adresser som har konto.
export const DUMMY_HASH =
  "$2b$12$eARqNPLvLTovv8oWo2vAI.73upgaFwgu7j9gp3ehttEXNNs3pW.iG";
