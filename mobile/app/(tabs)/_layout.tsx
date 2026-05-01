/**
 * Tab layout — bottom navigation.
 *
 * Tabs: Home, Giornata, Spese, Documenti, Altro
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight } from '../../src/design';

type TabIcon = keyof typeof Ionicons.glyphMap;

const tabs: { name: string; title: string; icon: TabIcon; iconFocused: TabIcon }[] = [
  { name: 'home', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'giornata', title: 'Giornata', icon: 'sunny-outline', iconFocused: 'sunny' },
  { name: 'spese', title: 'Spese', icon: 'receipt-outline', iconFocused: 'receipt' },
  { name: 'documenti', title: 'Documenti', icon: 'document-outline', iconFocused: 'document' },
  { name: 'altro', title: 'Altro', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
