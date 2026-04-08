declare module "react-use-keypress" {
  import type { DependencyList } from "react";

  export default function useKeypress(
    keys: string | string[],
    callback: (event: KeyboardEvent) => void,
    deps?: DependencyList,
  ): void;
}
