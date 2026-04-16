import type { Meta, StoryObj } from "@storybook/react-vite";
import { Home } from "./Home";

const meta = {
  title: "Screens/Home",
  component: Home,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
