import AuthForm from "@/components/AuthForm";
import Starfield from "@/components/Starfield";

export default function LoginPage() {
  return (
    <>
      <Starfield />
      <AuthForm mode="login" />
    </>
  );
}
