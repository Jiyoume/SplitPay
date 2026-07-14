import React from "react";
import { View, Text, Image } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string; size?: number }) {
  const { theme } = useAppTheme();
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: theme.surfaceMuted, alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ color: theme.primary, fontWeight: "600", fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}
