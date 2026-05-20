"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingPage } from "@/components/shared/LoadingSpinner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDriverRedirectPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=coordinadores");
  }, [router, id]);

  return <LoadingPage />;
}
