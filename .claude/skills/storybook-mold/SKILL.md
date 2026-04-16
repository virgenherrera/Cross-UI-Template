---
name: storybook-mold
description: >
  Storybook visual mold patterns for the Cross UI Template.
  Trigger: When creating React components in ui-spec-designer that serve as visual molds for your production app.
license: Apache-2.0
metadata:
  author: cross-ui-template
  version: "1.0"
---

## Visual Mold Pattern

Storybook components are NOT the production app. They are visual specifications (molds) that your production app replicates.

### Component Structure

```text
src/components/
  ComponentName/
    ComponentName.tsx         # The component
    ComponentName.stories.tsx # Stories with controls + autodocs
```

### Component Template

```tsx
import type { HTMLAttributes } from "react";

interface ComponentNameProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary";
}

export function ComponentName({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentNameProps) {
  return (
    <div
      className={`base-classes ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Story Template

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentName } from "./ComponentName";

const meta = {
  title: "Components/ComponentName",
  component: ComponentName,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Content" },
};
```

### Rules

- Import types from `@storybook/react-vite` (NOT `@storybook/react`) — pnpm strict isolation
- Use `satisfies Meta<typeof Component>` for type safety
- Every component MUST have `tags: ["autodocs"]` for auto-generated docs
- Use design token classes from shared theme (bg-primary, text-surface, px-md, etc.)
- All files MUST be `.tsx` — ZERO `.js`/`.jsx` allowed
- Components should be as pure as possible — minimal logic, maximum visual specification
