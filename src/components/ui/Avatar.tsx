// TODO: Install expo-image for built-in memory+disk caching:
//   npx expo install expo-image
// Then replace the react-native Image import with:
//   import { Image } from 'expo-image';
// And add cachePolicy="memory-disk" to the <Image /> component below.
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

export default function Avatar({ uri, name, size = 48 }: AvatarProps) {
  const { colors } = useTheme();

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceLight },
        ]}
        accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryDark,
        },
      ]}
      accessible
      accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: size * 0.35, color: colors.white },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: FontWeight.bold,
  },
});
