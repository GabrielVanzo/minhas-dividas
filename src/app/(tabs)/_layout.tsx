import { Tabs } from 'expo-router';
import { PieChart, WalletMinimal } from 'lucide-react-native';

import { Cores } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Cores.marcaClara,
        tabBarInactiveTintColor: Cores.textoApagado,
        tabBarStyle: {
          backgroundColor: Cores.superficie,
          borderTopColor: Cores.borda,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: Cores.fundo },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dívidas',
          tabBarIcon: ({ color, size }) => <WalletMinimal color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="resumo"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
