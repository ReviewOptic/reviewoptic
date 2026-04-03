import { useQuery } from "@tanstack/react-query";

interface Features {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  socialEnabled: boolean;
}

export function useFeatures(): Features {
  const { data } = useQuery<Features>({
    queryKey: ["/api/features"],
    staleTime: 5 * 60 * 1000,
  });
  return {
    smsEnabled: data?.smsEnabled ?? false,
    whatsappEnabled: data?.whatsappEnabled ?? false,
    socialEnabled: data?.socialEnabled ?? false,
  };
}
