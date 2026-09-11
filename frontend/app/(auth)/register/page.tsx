import AuthForm from "@/components/AuthForm";
import Starfield from "@/components/Starfield";

export default function RegisterPage() {
  return (
    <>
      <Starfield />
      <AuthForm mode="register" />
    </>
  );
}
