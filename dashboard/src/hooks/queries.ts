import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sessionApi,
  webhookApi,
  auditApi,
  infraApi,
  pluginsApi,
  contactApi,
  locationApi,
  type Webhook,
  type ContactPayload,
} from '../services/api';

// ── Query Keys ────────────────────────────────────────────────────────

export const queryKeys = {
  sessions: ['sessions'] as const,
  sessionStats: ['sessions', 'stats'] as const,
  sessionGroups: (sessionId: string) => ['sessions', sessionId, 'groups'] as const,
  webhooks: ['webhooks'] as const,
  logs: (params: { severity?: string; page: number; limit: number }) =>
    ['logs', params] as const,
  infraStatus: ['infra', 'status'] as const,
  plugins: ['plugins'] as const,
  engines: ['engines'] as const,
  currentEngine: ['engines', 'current'] as const,
  contacts: ['contacts'] as const,
  countries: ['locations', 'countries'] as const,
  states: (countryId: number) => ['locations', 'states', countryId] as const,
  cities: (stateId: number) => ['locations', 'cities', stateId] as const,
};

// ── Session Queries ───────────────────────────────────────────────────

export function useSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: sessionApi.list,
    staleTime: 30_000,
  });
}

export function useSessionStatsQuery() {
  return useQuery({
    queryKey: queryKeys.sessionStats,
    queryFn: sessionApi.getStats,
    staleTime: 30_000,
  });
}

export function useSessionGroupsQuery(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.sessionGroups(sessionId),
    queryFn: () => sessionApi.getGroups(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 60_000,
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => sessionApi.create(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
}

export function useDeleteSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    },
  });
}

export function useStartSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.start(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useStopSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.stop(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

// ── Webhook Queries ───────────────────────────────────────────────────

export function useWebhooksQuery() {
  return useQuery({
    queryKey: queryKeys.webhooks,
    queryFn: webhookApi.listAll,
    staleTime: 30_000,
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; url: string; events: string[] }) =>
      webhookApi.create(params.sessionId, { url: params.url, events: params.events }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; id: string; data: Partial<Webhook> }) =>
      webhookApi.update(params.sessionId, params.id, params.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; id: string }) =>
      webhookApi.delete(params.sessionId, params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

// ── Logs Queries ──────────────────────────────────────────────────────

export function useLogsQuery(params: { severity?: string; page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.logs(params),
    queryFn: () =>
      auditApi.list({
        severity: params.severity,
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      }),
    staleTime: 15_000,
  });
}

// ── Infrastructure Queries ────────────────────────────────────────────

export function useInfraStatusQuery() {
  return useQuery({
    queryKey: queryKeys.infraStatus,
    queryFn: infraApi.getStatus,
    staleTime: 30_000,
  });
}

// ── Plugin Queries ────────────────────────────────────────────────────

export function usePluginsQuery() {
  return useQuery({
    queryKey: queryKeys.plugins,
    queryFn: pluginsApi.list,
    staleTime: 30_000,
  });
}

export function useEnginesQuery() {
  return useQuery({
    queryKey: queryKeys.engines,
    queryFn: pluginsApi.getEngines,
    staleTime: 60_000,
  });
}

export function useCurrentEngineQuery() {
  return useQuery({
    queryKey: queryKeys.currentEngine,
    queryFn: pluginsApi.getCurrentEngine,
    staleTime: 60_000,
  });
}

// ── Contact Queries ───────────────────────────────────────────────────

export function useContactsQuery() {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: contactApi.list,
    staleTime: 30_000,
  });
}

export function useCreateContactMutation() {
  return useMutation({
    mutationFn: (data: ContactPayload) => contactApi.create(data),
  });
}

export function useUpdateContactMutation() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactPayload> }) =>
      contactApi.update(id, data),
  });
}

export function useDeleteContactMutation() {
  return useMutation({
    mutationFn: (id: string) => contactApi.delete(id),
  });
}

export function useBulkDeleteContactsMutation() {
  return useMutation({
    mutationFn: (ids: string[]) => contactApi.bulkDelete(ids),
  });
}

// ── Location Queries ───────────────────────────────────────────────

export function useCountriesQuery() {
  return useQuery({
    queryKey: queryKeys.countries,
    queryFn: locationApi.listCountries,
    staleTime: Infinity, // countries never change
  });
}

export function useStatesQuery(countryId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.states(countryId ?? 0),
    queryFn: () => locationApi.listStates(countryId!),
    enabled: enabled && !!countryId,
    staleTime: Infinity,
  });
}

export function useCitiesQuery(stateId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cities(stateId ?? 0),
    queryFn: () => locationApi.listCities(stateId!),
    enabled: enabled && !!stateId,
    staleTime: Infinity,
  });
}

export function useBulkCreateContactsMutation() {
  return useMutation({
    mutationFn: (contacts: ContactPayload[]) => contactApi.bulkCreate(contacts),
  });
}
