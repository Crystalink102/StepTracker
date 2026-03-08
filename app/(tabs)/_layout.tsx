import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/theme';

type TabIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

function HomeIcon({ color, size }: TabIconProps) {
  return <Ionicons name="home" size={size} color={color} />;
}

function ActivityIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'fitness' : 'fitness-outline'}
      size={size + 2}
      color={color}
    />
  );
}

function HistoryIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'stats-chart' : 'stats-chart-outline'}
      size={size}
      color={color}
    />
  );
}

function RanksIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'trophy' : 'trophy-outline'}
      size={size}
      color={color}
    />
  );
}

function ProfileIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'person-circle' : 'person-circle-outline'}
      size={size + 2}
      color={color}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: (props) => <HomeIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: (props) => <ActivityIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: (props) => <HistoryIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranks',
          tabBarIcon: (props) => <RanksIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: (props) => <ProfileIcon {...props} />,
        }}
      />
    </Tabs>
  );
}
