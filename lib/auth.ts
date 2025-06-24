import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export function getUserSession() {
  const { getUser } = getKindeServerSession();
  return getUser();
}