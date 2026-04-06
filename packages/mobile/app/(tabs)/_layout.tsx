import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabNavigationEventMap,
  type NativeBottomTabNavigationOptions,
} from '@bottom-tabs/react-navigation';
import type {
  ParamListBase,
  TabNavigationState,
} from '@react-navigation/native';
import { useTheme } from '../../src/theme';

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBarActiveTintColor={theme.accent}
      {...({
        barTintColor: theme.bgPrimary,
        scrollEdgeAppearance: 'opaque',
      } as Record<string, unknown>)}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kenno',
          tabBarIcon: () => ({ sfSymbol: 'hexagon.fill' }),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Arkisto',
          tabBarIcon: () => ({ sfSymbol: 'calendar' }),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Tilastot',
          tabBarIcon: () => ({ sfSymbol: 'chart.bar.fill' }),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Säännöt',
          tabBarIcon: () => ({ sfSymbol: 'questionmark.circle' }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Asetukset',
          tabBarIcon: () => ({ sfSymbol: 'gearshape' }),
        }}
      />
    </Tabs>
  );
}
