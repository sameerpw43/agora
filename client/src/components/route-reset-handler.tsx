import { useRouteResetCall } from '@/hooks/use-route-reset-call';

/**
 * Component that resets call state when routes change.
 * This helps ensure call notifications don't persist when users navigate away.
 */
export function RouteResetHandler() {
  // This hook will handle the reset logic on route changes
  useRouteResetCall();
  
  // This component doesn't render anything visible
  return null;
}