import { useMemo } from 'react';
import { muxApi, type MuxApi } from '@/relay/muxApi';
import { useAuth } from './AuthContext';

/** The relayed mux API for one machine. */
export function useMachineApi(machineId: string): MuxApi {
  const { auth } = useAuth();
  return useMemo(() => muxApi(auth.client, machineId), [auth, machineId]);
}
