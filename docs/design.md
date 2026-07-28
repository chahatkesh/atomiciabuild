# Design System

UI built with **Ant Design 6** and a clinic-focused theme.

## Theme tokens

Configured in `src/providers/AntdAppProvider.tsx`:

| Token          | Value       | Usage                  |
| -------------- | ----------- | ---------------------- |
| `colorPrimary` | `#1677ff`   | Primary actions, links |
| `borderRadius` | `8px`       | Cards, inputs, buttons |
| `fontFamily`   | Inter stack | Body text              |
| Layout header  | `#ffffff`   | Top bar                |
| Layout body    | `#f5f7fb`   | Page background        |
| Sider          | `#001529`   | Navigation             |

## Component mapping (by screen)

| Screen        | antd components                                              |
| ------------- | ------------------------------------------------------------ |
| Login         | `Card`, `Form`, `Input`, `Input.Password`, `Button`, `Alert` |
| App shell     | `Layout`, `Sider`, `Header`, `Content`, `Menu`, `Typography` |
| Shifts list   | `Table`, `Tag`, `Button`, `Space`, `Modal`, `Form`           |
| Shift form    | `Form`, `DatePicker`, `TimePicker`, `InputNumber`, `Select`  |
| My shifts     | `List`, `Card`, `Button`, `Empty`                            |
| Coverage      | `Calendar` / custom week grid, `Badge`, `Tooltip`, `Tag`     |
| Import report | `Table`, `Upload`, `Statistic`, `Collapse`, `Tag`            |

## Layout

- **Desktop:** Fixed sider (240px), content area with 24px margin
- **Tablet (`lg` breakpoint):** Sider collapses to drawer (`breakpoint="lg"`)
- **Mobile:** Single column; week coverage stacks vertically

## Status colors

| Status            | Color token | Meaning                        |
| ----------------- | ----------- | ------------------------------ |
| Fully staffed     | `success`   | All roles filled               |
| Partially staffed | `warning`   | Some roles missing             |
| Empty             | `error`     | No claims                      |
| Released claim    | `default`   | Auto-released after shift edit |

## States

Every data screen must handle:

1. **Loading** — `Spin` or `Skeleton`
2. **Empty** — `Empty` with contextual message + CTA
3. **Error** — `Alert` with retry action
4. **Success feedback** — `App.useApp().message.success()`

## App Router antd rules

- Wrap app in `AntdRegistry` (SSR styles)
- Wrap interactive pages in `App` provider for `message`/`modal`
- Import subcomponents from paths, not dot notation:
  ```tsx
  // ✗ <Select.Option />
  // ✓ import Select from 'antd'; const { Option } = Select; — or use options prop
  ```

## Responsive coverage dashboard (Phase 3)

Week grid columns = days (Mon–Sun). Each cell shows shift cards with:

- Time range
- Staffing badge
- Missing roles as `Tag` list
- Tap/click → shift detail

Week navigation: `Button.Group` with prev/next + date picker jump.
