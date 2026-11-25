import { Header } from "@/components/layout/header";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 pb-20 md:pb-0">{children}</main>
    </>
  );
}
