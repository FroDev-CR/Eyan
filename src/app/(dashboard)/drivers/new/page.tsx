"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingPage } from "@/components/shared/LoadingSpinner";

export default function NewDriverRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=coordinadores");
  }, [router]);
  return <LoadingPage />;
}
