import { createGlobalState } from "react-hooks-global-state";

const initialState = { photoToScrollTo: null as string | null };
const { useGlobalState } = createGlobalState(initialState);

export const useLastViewedPhoto = () => {
  return useGlobalState("photoToScrollTo");
};
