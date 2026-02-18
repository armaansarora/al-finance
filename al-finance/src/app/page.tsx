import { isLoggedIn } from "@/lib/session";
import LoginPage from "@/components/LoginPage";
import FinanceApp from "@/components/FinanceApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authed = await isLoggedIn();

  if (!authed) {
    return <LoginPage />;
  }

  return <FinanceApp />;
}
