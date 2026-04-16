import type { Meta, StoryObj } from "@storybook/react-vite";

import { Home } from "../Home/Home";
import { Splash } from "../Splash/Splash";

type FlowComponent = typeof Splash | typeof Home;

const meta = {
  title: "Flows/SplashToHome",
  parameters: {
    layout: "fullscreen",
    flow: { steps: ["Step1Splash", "Step2Home"] },
  },
} satisfies Meta<FlowComponent>;

export default meta;
type Story = StoryObj<FlowComponent>;

export const Step1Splash: Story = { render: () => <Splash /> };
export const Step2Home: Story = { render: () => <Home /> };
