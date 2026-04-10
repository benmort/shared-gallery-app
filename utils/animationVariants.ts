/** Subtle slide + fade — large offsets feel sluggish on desktop lightbox. */
const SLIDE = 36;

export const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? SLIDE : -SLIDE,
      opacity: 0,
    };
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      x: direction < 0 ? SLIDE : -SLIDE,
      opacity: 0,
    };
  },
};
