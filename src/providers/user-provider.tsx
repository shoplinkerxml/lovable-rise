import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAuthService } from "@/lib/user-auth-service";
import { TariffService } from "@/lib/tariff-service";
import { SubscriptionValidationService } from "@/lib/subscription-validation-service";
import { UserProfile } from "@/lib/user-auth-schemas";

type SubscriptionResult = {
  hasValidSubscription: boolean;
  isDemo?: boolean;
  subscription?: any | null;
};

type Ctx = {
  session: any | null;
  profile: UserProfile | null;
  subscription: SubscriptionResult | null;
  tariffLimits: { limit_name: string; value: number; id?: number }[];
  refresh: () => Promise<void>;
};

const UserContext = React.createContext<Ctx | null>(null);

export function UserProvider({ children, initialUser, initialSubscription }: { children: React.ReactNode, initialUser?: UserProfile | null, initialSubscription?: SubscriptionResult | null }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['auth','session'],
    queryFn: async () => {
      const { session } = await UserAuthService.getCurrentUser();
      return session || null;
    },
    initialData: () => queryClient.getQueryData(['auth','session']) as any | null,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const profileQuery = useQuery({
    queryKey: ['user','profile'],
    queryFn: async () => {
      const { user } = await UserAuthService.getCurrentUser();
      return user || null;
    },
    initialData: () => (initialUser ?? (queryClient.getQueryData(['user','profile']) as UserProfile | null)),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', profileQuery.data?.id],
    queryFn: async () => {
      if (!profileQuery.data?.id) return null as SubscriptionResult | null;
      return await SubscriptionValidationService.ensureValidSubscription(profileQuery.data.id);
    },
    enabled: !!profileQuery.data?.id,
    initialData: () => initialSubscription ?? (queryClient.getQueryData(['subscription', profileQuery.data?.id]) as SubscriptionResult | null),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const tariffId = subscriptionQuery.data?.subscription?.tariffs?.id ?? subscriptionQuery.data?.subscription?.tariff_id ?? null;
  const limitsQuery = useQuery({
    queryKey: ['tariffLimits', tariffId],
    queryFn: async () => {
      if (!tariffId) return [] as { limit_name: string; value: number; id?: number }[];
      const res = await TariffService.getTariffLimits(tariffId as number);
      return res || [];
    },
    enabled: !!tariffId,
    initialData: () => (queryClient.getQueryData(['tariffLimits', tariffId]) as { limit_name: string; value: number; id?: number }[] | undefined) ?? [],
    staleTime: 900_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev as { limit_name: string; value: number; id?: number }[] | undefined,
  });

  const refresh = async () => {
    if (profileQuery.data?.id) {
      await queryClient.invalidateQueries({ queryKey: ['subscription', profileQuery.data.id] });
    }
    if (tariffId) {
      await queryClient.invalidateQueries({ queryKey: ['tariffLimits', tariffId] });
    }
  };

  const value: Ctx = {
    session: sessionQuery.data ?? null,
    profile: profileQuery.data ?? null,
    subscription: subscriptionQuery.data ?? null,
    tariffLimits: limitsQuery.data ?? [],
    refresh,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserData() {
  const ctx = React.useContext(UserContext);
  if (!ctx) throw new Error('UserProvider missing');
  return ctx;
}