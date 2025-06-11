import {
  StyleProp,
  View,
  ViewProps,
  ViewStyle,
} from "react-native"
import type { ThemedStyle, ThemedStyleArray } from "@/theme"
import { $styles } from "../theme"
import { useAppTheme } from "@/utils/useAppTheme"

type Presets = "default" | "reversed"

interface CardViewProps extends ViewProps {
  children: React.ReactNode
  style? : StyleProp<ViewStyle>
  preset?: Presets
}

export function CardView(props: CardViewProps) {
  const {
    children,
    style,
  } = props

  const { themed } = useAppTheme();
  const preset : Presets = props.preset ?? "default";

  const $containerStyle: StyleProp<ViewStyle> = [
    themed($containerPresets[preset]),
    style,
  ];

  return (
    <View style={[themed($containerStyle)]}>
      {children}
    </View>
  )
}

const $containerBase: ThemedStyle<ViewStyle> = (theme) => ({
  borderRadius: theme.spacing.md,
  padding: theme.spacing.xs,
  borderWidth: 1,
  shadowColor: theme.colors.palette.neutral800,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.08,
  shadowRadius: 12.81,
  elevation: 16,
  minHeight: 192,
  marginTop : theme.spacing.xs,
  marginHorizontal : theme.spacing.xs,
})

const $containerPresets: Record<Presets, ThemedStyleArray<ViewStyle>> = {
  default: [
    $styles.container,
    $containerBase,
    (theme) => ({
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.palette.neutral300,
    }),
  ],
  reversed: [
    $styles.container,
    $containerBase,
    (theme) => ({
      backgroundColor: theme.colors.palette.neutral800,
      borderColor: theme.colors.palette.neutral500,
    }),
  ],
}
