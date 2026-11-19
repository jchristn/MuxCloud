import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/palette";
import { lockTransition } from "@/lib/lockPolicy";
import { Button, T } from "./ui";

/** Optional biometric lock: when enabled, the app asks for Face ID, Touch ID, or the device passcode on launch and on return from the background. */
export function LockGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const p = useTheme();
  const { t } = useTranslation();
  const [locked, setLocked] = useState(enabled);
  const [wasEnabled, setWasEnabled] = useState(enabled);
  const prompting = useRef(false);
  const lockedRef = useRef(locked);
  const wentBackground = useRef(false);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  // Turning the lock on locks immediately (state adjusted during render, not in an effect).
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled);
    if (enabled) setLocked(true);
  }

  const unlock = useCallback(async () => {
    if (prompting.current || !lockedRef.current) return;
    prompting.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("mobile.lock.prompt"),
        cancelLabel: t("common.cancel"),
      });
      if (result.success) {
        lockedRef.current = false;
        setLocked(false);
      }
    } finally {
      prompting.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (!enabled) return;
    void Promise.resolve().then(unlock);
    const sub = AppState.addEventListener("change", (state) => {
      const step = lockTransition(
        state,
        lockedRef.current,
        wentBackground.current,
      );
      wentBackground.current = step.wentBackground;
      if (step.lock) {
        lockedRef.current = true;
        setLocked(true);
      }
      if (step.prompt) void unlock();
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  if (!enabled || !locked) return <>{children}</>;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.lg,
        padding: spacing.xl,
      }}
    >
      <T variant="heading">{t("mobile.lock.title")}</T>
      <Button title={t("mobile.lock.unlock")} onPress={() => void unlock()} />
    </View>
  );
}
